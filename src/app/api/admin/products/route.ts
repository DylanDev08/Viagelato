import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError,productSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";
import {normalizeProductWrite} from "@/lib/product-write";

const uuid=z.uuid();
function failed(code?:string){
 if(code==="23505")return NextResponse.json({error:"SKU o URL de producto ya existentes"},{status:409});
 return NextResponse.json({error:"No se pudo guardar el producto"},{status:400});
}
const invalidId=()=>NextResponse.json({error:"El identificador del producto no es válido"},{status:400});
export async function POST(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const parsed=productSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Datos inválidos",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("products").insert(normalizeProductWrite(parsed.data)).select().single();
 return error?failed(error.code):NextResponse.json(data);
}
export async function PATCH(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const body=await req.json().catch(()=>null);
 const parsedId=uuid.safeParse(body?.id);
 if(!parsedId.success)return invalidId();
 const payload={...body};
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
 const body=await req.json().catch(()=>null);
 const parsedId=uuid.safeParse(body?.id);
 if(!parsedId.success)return invalidId();
 const {data,error}=await privilegedDb().from("products").update({active:false,catalog_visible:false}).eq("id",parsedId.data).select("id").maybeSingle();
 if(error)return failed(error.code);
 if(!data)return NextResponse.json({error:"Producto inexistente"},{status:404});
 return NextResponse.json({ok:true});
}
