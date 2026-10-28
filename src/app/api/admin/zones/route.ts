import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError,zoneSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const idSchema=z.uuid();
const failed=()=>NextResponse.json({error:"No se pudo guardar la zona. Revisá los datos e intentá nuevamente."},{status:400});
const invalidId=()=>NextResponse.json({error:"El identificador de la zona no es válido"},{status:400});
const missing=()=>NextResponse.json({error:"Esta zona ya no existe. Actualizá la página."},{status:404});
export async function POST(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const parsed=zoneSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Revisá la zona y su tarifa",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("shipping_zones").insert(parsed.data).select().single();
 return error?failed():NextResponse.json(data);
}
export async function PATCH(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const body=await req.json().catch(()=>null);
 const id=idSchema.safeParse(body?.id);
 if(!id.success)return invalidId();
 const payload={...body};delete payload.id;
 const parsed=zoneSchema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Revisá la zona y su tarifa",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("shipping_zones").update(parsed.data).eq("id",id.data).select().maybeSingle();
 if(error)return failed();
 return data?NextResponse.json(data):missing();
}
export async function DELETE(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const body=await req.json().catch(()=>null);
 const id=idSchema.safeParse(body?.id);
 if(!id.success)return invalidId();
 const {data,error}=await privilegedDb().from("shipping_zones").update({active:false}).eq("id",id.data).select("id").maybeSingle();
 if(error)return failed();
 return data?NextResponse.json({ok:true}):missing();
}
