import {createHash,createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {connected,privilegedDb} from "@/lib/supabase";

export const runtime="nodejs";
const schema=z.object({
 customer_name:z.string().trim().min(2).max(120),
 customer_email:z.email().max(200),
 customer_phone:z.string().trim().min(6).max(35),
 address:z.string().trim().max(250).default(""),
 postal_code:z.string().trim().max(20).default(""),
 shipping_method:z.enum(["pickup","shipping"]),
 shipping_zone_id:z.uuid().nullable(),
 payment_method:z.enum(["transfer","on_delivery"]),
 items:z.array(z.object({product_id:z.uuid(),quantity:z.number().int().min(1).max(99)})).min(1).max(40),
});

function jsonError(error:string,status:number,headers?:HeadersInit){return NextResponse.json({error},{status,headers:{"Cache-Control":"no-store",...headers}})}
function clientKey(request:Request){const raw=request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";return createHmac("sha256",process.env.CHECKOUT_RATE_LIMIT_SALT!).update(raw).digest("hex")}

export async function POST(request:Request){
 if(process.env.ENABLE_CHECKOUT!=="true"||!connected())return jsonError("Los pedidos todavía no están habilitados",503);
 if(!process.env.CHECKOUT_RATE_LIMIT_SALT)return jsonError("Falta completar la seguridad del checkout",503);
 const idempotencyHeader=request.headers.get("idempotency-key");
 const idempotency=z.uuid().safeParse(idempotencyHeader);
 if(!idempotency.success)return jsonError("Falta una clave de idempotencia válida",400);
 const body=await request.json().catch(()=>null);
 const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"Revisá los datos de la compra",issues:parsed.error.issues.map(issue=>({path:issue.path,message:issue.message}))},{status:400,headers:{"Cache-Control":"no-store"}});
 const data=parsed.data;
 if(data.shipping_method==="shipping"&&(!data.shipping_zone_id||data.address.length<5))return jsonError("Completá dirección y zona",400);
 const db=privilegedDb();
 const {data:allowed,error:rateError}=await db.rpc("consume_checkout_attempt",{p_key_hash:clientKey(request),p_idempotency_key:idempotency.data,p_limit:5,p_window_minutes:10});
 if(rateError)return jsonError("No se pudo validar la seguridad del pedido",503);
 if(!allowed)return jsonError("Demasiados intentos. Esperá diez minutos antes de volver a intentar.",429,{"Retry-After":"600"});
 const normalized={...data,items:[...data.items].sort((a,b)=>a.product_id.localeCompare(b.product_id))};
 const fingerprint=createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
 const {data:reserved,error}=await db.rpc("reserve_order",{
  p_items:data.items,p_customer_name:data.customer_name,p_customer_email:data.customer_email,p_customer_phone:data.customer_phone,
  p_address:data.address,p_postal_code:data.postal_code,p_shipping_method:data.shipping_method,
  p_shipping_zone_id:data.shipping_method==="shipping"?data.shipping_zone_id:null,p_payment_method:data.payment_method,
  p_idempotency_key:idempotency.data,p_request_fingerprint:fingerprint,
 });
 if(error||!reserved){
  const message=error?.message||"No se pudo registrar el pedido";
  const safeMessage=/stock insuficiente|zona sin tarifa|fuera de cobertura|no está habilitado|idempotencia/i.test(message)?message:"No se pudo confirmar el pedido. Revisá disponibilidad y datos.";
  return jsonError(safeMessage,409);
 }
 let bank:null|{bank_alias:string;bank_cbu:string;bank_holder:string}=null;
 if(reserved.payment_method==="transfer"){
  const {data:payment}=await db.from("payment_settings").select("bank_alias,bank_cbu,bank_holder").eq("id",true).single();
  if(payment)bank=payment;
 }
 return NextResponse.json({order_id:String(reserved.id),total:Number(reserved.total),payment_method:String(reserved.payment_method),idempotent:Boolean(reserved.idempotent),bank},{status:reserved.idempotent?200:201,headers:{"Cache-Control":"no-store"}});
}
