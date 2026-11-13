import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError,bannerSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";
import {readAdminJson} from "@/lib/admin-body";

const idSchema=z.uuid();
const failed=()=>NextResponse.json({error:"No se pudo guardar el banner. Revisá los datos e intentá nuevamente."},{status:400});
const invalidId=()=>NextResponse.json({error:"El identificador del banner no es válido"},{status:400});
const missing=()=>NextResponse.json({error:"Este banner ya no existe. Actualizá la página."},{status:404});
export async function POST(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req,8000);if(!json.ok)return json.response;
 const parsed=bannerSchema.safeParse(json.data);
 if(!parsed.success)return NextResponse.json({error:"Revisá los datos del banner",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("banners").insert({...parsed.data,image_url:parsed.data.image_url||null}).select().single();
 return error?failed():NextResponse.json(data);
}
export async function PATCH(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req,8000);if(!json.ok)return json.response;
 const body=json.data;
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Datos inválidos"},{status:400});
 const input=body as Record<string,unknown>;
 const id=idSchema.safeParse(input.id);
 if(!id.success)return invalidId();
 const payload={...input};delete payload.id;
 const parsed=bannerSchema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Revisá los datos del banner",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("banners").update({...parsed.data,image_url:parsed.data.image_url||null}).eq("id",id.data).select().maybeSingle();
 if(error)return failed();
 return data?NextResponse.json(data):missing();
}
export async function DELETE(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req,8000);if(!json.ok)return json.response;
 const body=json.data;
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Datos inválidos"},{status:400});
 const input=body as Record<string,unknown>;
 const id=idSchema.safeParse(input.id);
 if(!id.success)return invalidId();
 const {data,error}=await privilegedDb().from("banners").delete().eq("id",id.data).select("id").maybeSingle();
 if(error)return failed();
 return data?NextResponse.json({ok:true}):missing();
}
