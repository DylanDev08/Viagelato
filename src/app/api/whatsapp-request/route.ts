import {createHash,createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {connected,privilegedDb} from "@/lib/supabase";
import {whatsappCartMessage,type WhatsAppCartLine} from "@/lib/whatsapp-cart";
import {normalizeWhatsAppRequest,whatsappRequestSchema,whatsappRequestReference} from "@/lib/whatsapp-request-rules";
import {whatsappHref} from "@/lib/whatsapp";
import {readJsonBody,RequestBodyError} from "@/lib/request-body";
import {isAllowedAdminMutation} from "@/lib/admin-origin";

export const runtime="nodejs";
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const uuid=z.uuid();
function fingerprint(body:unknown){return createHash("sha256").update(JSON.stringify(body)).digest("hex");}
function rateKey(request:Request){
 const secret=process.env.CHECKOUT_RATE_LIMIT_SALT||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)throw new Error("Falta clave del limitador");
 const ip=request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 return createHmac("sha256",secret).update(ip).digest("hex");
}
type RequestSnapshot={
 id:string;request_fingerprint:string;status:string;
 customer_name:string;locality:string;address:string;notes:string;
 shipping_method:"pickup"|"shipping";subtotal:number;items:WhatsAppCartLine[];
};
type CommercialSettings={whatsapp:string;free_shipping_threshold:number;pickup_enabled:boolean};
const snapshotFields="id,request_fingerprint,status,customer_name,locality,address,notes,shipping_method,items,subtotal";

function preparedResponse(record:RequestSnapshot,settings:CommercialSettings,created:boolean){
 if(record.status!=="draft"&&record.status!=="contacted"){
  return NextResponse.json({
   error:"Esta solicitud ya fue gestionada. Revisá el carrito y volvé a preparar una nueva solicitud.",
   code:"REQUEST_ALREADY_HANDLED"
  },{status:409,headers:{"Cache-Control":"no-store"}});
 }
 // Al reintentar, siempre usar el precio, cantidades y datos guardados en la primera solicitud.
 // De otro modo una actualización del catálogo podría cambiar el WhatsApp sin cambiar el pedido.
 const reference=whatsappRequestReference(record.id);
 const message=[
  "Referencia: "+reference,
  whatsappCartMessage(record.items,{
   name:record.customer_name,locality:record.locality,address:record.address,notes:record.notes,
   shippingMethod:record.shipping_method,freeShippingThreshold:Number(settings.free_shipping_threshold)
  })
 ].join("\n");
 const whatsapp_url=whatsappHref(settings.whatsapp,message);
 if(!whatsapp_url)return reply("No se pudo preparar el vínculo de WhatsApp",503);
 return NextResponse.json({reference,whatsapp_url,status:record.status,subtotal:Number(record.subtotal)},{
  status:created?201:200,headers:{"Cache-Control":"no-store"}
 });
}

export async function POST(request:Request){
 try{return await prepareRequest(request);}
 catch(error){
  if(error instanceof RequestBodyError)return reply(error.message,error.status);
  return reply("No pudimos preparar la solicitud. Volvé a intentar con el mismo carrito.",503);
 }
}

async function prepareRequest(request:Request){
 if(!connected())return reply("La recepción de solicitudes todavía no está configurada",503);
 // Checkout público: aceptar sólo orígenes comerciales declarados, sin confiar en host/proxy.
 // El despliegue público puede usarse desde Vercel o el dominio de Render.
 const publicOrigins=[
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.CHECKOUT_ALLOWED_ORIGINS,
  "https://viagelato.vercel.app",
  "https://viagelato-api.onrender.com",
 ].filter(Boolean).join(",");
 if(!isAllowedAdminMutation(request,undefined,publicOrigins))return reply("Origen no permitido",403);
 const key=uuid.safeParse(request.headers.get("idempotency-key"));
 if(!key.success)return reply("Falta identificar esta solicitud",400);
 const body=await readJsonBody(request);
 const parsed=whatsappRequestSchema.safeParse(body);
 if(!parsed.success)return reply("Revisá tu nombre, localidad y productos",400);
 const input=normalizeWhatsAppRequest(parsed.data);
 const db=privilegedDb();
 const {data:allowed,error:rateError}=await db.rpc("consume_checkout_attempt",{
  p_key_hash:rateKey(request),p_idempotency_key:key.data,p_limit:8,p_window_minutes:10
 });
 if(rateError)return reply("No pudimos validar la seguridad de la solicitud",503);
 if(!allowed)return NextResponse.json({error:"Demasiados intentos. Volvé a intentarlo en unos minutos."},{status:429,headers:{"Cache-Control":"no-store","Retry-After":"600"}});
 const hash=fingerprint(input);
 const {data:settings,error:settingsError}=await db.from("site_settings").select("whatsapp,free_shipping_threshold,pickup_enabled").eq("id",true).single();
 if(settingsError||!settings)return reply("No encontramos la configuración comercial",503);
 if(input.shipping_method==="pickup"&&!settings.pickup_enabled)return reply("El retiro no está habilitado",409);
 if(!whatsappHref(settings.whatsapp,"Prueba")?.includes("?text="))return reply("El WhatsApp comercial debe configurarse con un número válido",503);
 // Buscar primero la idempotencia: si el catálogo cambió o se ocultó un producto,
 // la solicitud existente debe conservar sus precios y líneas originales.
 const {data:prior,error:priorError}=await db.from("whatsapp_order_requests").select(snapshotFields)
  .eq("idempotency_key",key.data).maybeSingle();
 if(priorError)return reply("No se pudo revisar esta solicitud",503);
 if(prior){
  if(prior.request_fingerprint!==hash)return reply("Esta solicitud cambió. Revisá el carrito e intentá otra vez.",409);
  return preparedResponse(prior as RequestSnapshot,settings,false);
 }
 const source=new Map<string,{name:string;sku:string;presentation:string;price:number}>();
 // Revalidar cada fila del catálogo en Supabase: nunca cotizar desde el JSON
 // ni aceptar una ficha que el administrador haya ocultado.
 const requestedRows=input.items.filter(item=>item.id.startsWith("catalog-price-"))
  .map(item=>Number(item.id.slice("catalog-price-".length)));
 if(requestedRows.length){
  const {data:catalog,error:catalogError}=await db.from("products")
   .select("slug,name,sku,presentation,price")
   .eq("catalog_visible",true)
   .in("slug",requestedRows.map(row=>"excel-fila-"+row));
  if(catalogError||!catalog||catalog.length!==requestedRows.length)
   return reply("Hay productos ocultos o no disponibles. Actualizá el carrito.",409);
  for(const item of catalog){
   const row=Number(item.slug.slice("excel-fila-".length));
   if(!requestedRows.includes(row)||!Number.isFinite(Number(item.price))||Number(item.price)<=0)
    return reply("El catálogo cambió. Revisá el carrito.",409);
   source.set("catalog-price-"+row,{name:item.name,sku:item.sku??"",presentation:item.presentation??"",price:Number(item.price)});
  }
 }
 const ids=input.items.filter(item=>!source.has(item.id)).map(item=>item.id);
 if(ids.length){
  if(!ids.every(id=>uuid.safeParse(id).success))return reply("Hay productos no disponibles",409);
  const {data:products,error:productError}=await db.from("products").select("id,name,sku,presentation,price,stock")
    .in("id",ids).eq("active",true).eq("commercially_verified",true).gt("price",0);
  if(productError||!products||products.length!==ids.length)return reply("El carrito contiene productos que ya no están disponibles",409);
  for(const product of products){
   const quantity=input.items.find(item=>item.id===product.id)!.quantity;
   if(!Number.isFinite(Number(product.price))||Number(product.price)<=0||!Number.isInteger(product.stock)||product.stock<quantity)
    return reply("Hay productos sin stock suficiente o sin precio vigente. Revisá el carrito.",409);
   source.set(product.id,{name:product.name,sku:product.sku??"",presentation:product.presentation??"",price:Number(product.price)});
  }
 }
 const lines=input.items.map(item=>{
  const product=source.get(item.id);
  return product?{id:item.id,name:product.name,sku:product.sku,presentation:product.presentation,price:Number(product.price),quantity:item.quantity}:null;
 });
 if(lines.some(line=>!line))return reply("Actualizá el carrito antes de continuar",409);
 const safeLines=lines.filter(line=>line!==null);
 const subtotal=safeLines.reduce((sum,line)=>sum+Math.round(line.price*100)*line.quantity,0)/100;
 if(!Number.isFinite(subtotal)||subtotal<=0||subtotal>1e9)return reply("El subtotal no es válido",400);
 if(input.expected_subtotal!==undefined&&Math.abs(input.expected_subtotal-subtotal)>0.01)
  return reply("Los precios cambiaron. Actualizá el carrito para revisarlos antes de enviar el pedido.",409);
 const insert={idempotency_key:key.data,request_fingerprint:hash,customer_name:input.customer_name,
  locality:input.locality,address:input.address,notes:input.notes,shipping_method:input.shipping_method,
  items:safeLines,subtotal};
 const {data:created,error:insertError}=await db.from("whatsapp_order_requests")
  .upsert(insert,{onConflict:"idempotency_key",ignoreDuplicates:true}).select(snapshotFields).maybeSingle();
 if(insertError)return reply("No se pudo guardar la solicitud. No se inició ninguna compra.",503);
 let record=created;
 if(!record){
  const existing=await db.from("whatsapp_order_requests").select(snapshotFields).eq("idempotency_key",key.data).maybeSingle();
  if(existing.error||!existing.data)return reply("No se pudo recuperar la solicitud",503);
  record=existing.data;
 }
 if(record.request_fingerprint!==hash)return reply("Esta solicitud cambió. Revisá el carrito e intentá otra vez.",409);
 return preparedResponse(record as RequestSnapshot,settings,Boolean(created));
}
