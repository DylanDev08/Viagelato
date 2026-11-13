import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError,productSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";
import {readAdminJson} from "@/lib/admin-body";
import {normalizeProductWrite} from "@/lib/product-write";

const uuid=z.uuid();
function failed(code?:string){
 if(code==="23505")return NextResponse.json({error:"SKU o URL de producto ya existentes"},{status:409});
 return NextResponse.json({error:"No se pudo guardar el producto"},{status:400});
}
const invalidId=()=>NextResponse.json({error:"El identificador del producto no es válido"},{status:400});
export async function POST(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req,16000);if(!json.ok)return json.response;
 const parsed=productSchema.safeParse(json.data);
 if(!parsed.success)return NextResponse.json({error:"Datos inválidos",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("products").insert(normalizeProductWrite(parsed.data)).select().single();
 return error?failed(error.code):NextResponse.json(data);
}
export async function PATCH(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req,16000);if(!json.ok)return json.response;
 const body=json.data;
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Datos inválidos"},{status:400});
 const input=body as Record<string,unknown>;
 const parsedId=uuid.safeParse(input.id);
 if(!parsedId.success)return invalidId();
 const payload={...input};
 delete payload.id;
 const parsed=productSchema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Datos inválidos",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("products").update(normalizeProductWrite(parsed.data)).eq("id",parsedId.data).select().maybeSingle();
 if(error)return failed(error.code);
 if(!data)return NextResponse.json({error:"Producto inexistente"},{status:404});
 return NextResponse.json(data);
}
export async function DELETE(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req,16000);if(!json.ok)return json.response;
 const body=json.data;
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Datos inválidos"},{status:400});
 const input=body as Record<string,unknown>;
 const parsedId=uuid.safeParse(input.id);
 if(!parsedId.success)return invalidId();
 if(input.action!==undefined&&input.action!=="delete_permanently")return NextResponse.json({error:"Operación no permitida"},{status:400});
 if(input.action==="delete_permanently"){
  const db=privilegedDb();
  const product=await db.from("products").select("id,active,catalog_visible").eq("id",parsedId.data).maybeSingle();
  if(product.error)return failed(product.error.code);
  if(!product.data)return NextResponse.json({error:"Producto inexistente"},{status:404});
  if(product.data.active||product.data.catalog_visible)
   return NextResponse.json({error:"Primero ocultá el producto de la tienda para poder eliminarlo."},{status:409});
  // Conservamos referencias y registros históricos. La FK order_items->products
  // usa SET NULL: impedir la eliminación expresamente antes de llegar a ese efecto.
  const [orders,requests]=await Promise.all([
   db.from("order_items").select("id",{count:"exact",head:true}).eq("product_id",parsedId.data),
   db.from("whatsapp_order_requests").select("id",{count:"exact",head:true}).contains("items",[{id:parsedId.data}]),
  ]);
  if(orders.error||requests.error)return NextResponse.json({error:"No se pudo verificar el historial del producto."},{status:503});
  if((orders.count??0)>0||(requests.count??0)>0)
   return NextResponse.json({error:"Este producto tiene pedidos asociados. Podés mantenerlo oculto, pero no eliminar su registro."},{status:409});
  const deleted=await db.from("products").delete().eq("id",parsedId.data).eq("active",false).eq("catalog_visible",false).select("id").maybeSingle();
  if(deleted.error)return failed(deleted.error.code);
  if(!deleted.data)return NextResponse.json({error:"No se pudo eliminar: el producto cambió de estado o no existe."},{status:409});
  return NextResponse.json({ok:true,deleted:true});
 }
 const {data,error}=await privilegedDb().from("products").update({active:false,catalog_visible:false}).eq("id",parsedId.data).select("id").maybeSingle();
 if(error)return failed(error.code);
 if(!data)return NextResponse.json({error:"Producto inexistente"},{status:404});
 return NextResponse.json({ok:true});
}
