import {NextResponse} from "next/server";
import {readAdminJson} from "@/lib/admin-body";
import {z} from "zod";
import {adminOrError,bannerSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const idSchema=z.uuid();
const failed=()=>NextResponse.json({error:"No se pudo guardar el banner. Revisá los datos e intentá nuevamente."},{status:400});
const invalidId=()=>NextResponse.json({error:"El identificador del banner no es válido"},{status:400});
const missing=()=>NextResponse.json({error:"Este banner ya no existe. Actualizá la página."},{status:404});
export async function POST(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req);if(!json.ok)return json.response;
 const parsed=bannerSchema.safeParse(json.data);
 if(!parsed.success)return NextResponse.json({error:"Revisá los datos del banner",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("banners").insert({...parsed.data,image_url:parsed.data.image_url||null}).select().single();
 return error?failed():NextResponse.json(data);
}
export async function PATCH(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req);if(!json.ok)return json.response;
 const body=json.data as Record<string,unknown>|null;
 const id=idSchema.safeParse(body?.id);
 if(!id.success)return invalidId();
 const payload={...body};delete payload.id;
 const parsed=bannerSchema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Revisá los datos del banner",issues:parsed.error.issues},{status:400});
 const {data,error}=await privilegedDb().from("banners").update({...parsed.data,image_url:parsed.data.image_url||null}).eq("id",id.data).select().maybeSingle();
 if(error)return failed();
 return data?NextResponse.json(data):missing();
}
export async function DELETE(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const json=await readAdminJson(req);if(!json.ok)return json.response;
 const body=json.data as Record<string,unknown>|null;
 const id=idSchema.safeParse(body?.id);
 if(!id.success)return invalidId();
 const {data,error}=await privilegedDb().from("banners").delete().eq("id",id.data).select("id").maybeSingle();
 if(error)return failed();
 return data?NextResponse.json({ok:true}):missing();
}
