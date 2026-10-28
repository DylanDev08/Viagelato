import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const schema=z.object({name:z.string().trim().min(2).max(100),slug:z.string().regex(/^[a-z0-9-]{2,100}$/)});
const uuid=z.uuid();
const failed=()=>NextResponse.json({error:"No se pudo guardar la categoría"},{status:400});
const invalidId=()=>NextResponse.json({error:"ID de categoría inválido"},{status:400});
export async function POST(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Categoría inválida"},{status:400});
 const {data,error}=await privilegedDb().from("categories").insert(parsed.data).select().single();
 return error?failed():NextResponse.json(data);
}
export async function PATCH(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const body=await req.json().catch(()=>null);
 const id=uuid.safeParse(body?.id);
 if(!id.success)return invalidId();
 const payload={...body};delete payload.id;
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Categoría inválida"},{status:400});
 const {data,error}=await privilegedDb().from("categories").update(parsed.data).eq("id",id.data).select().maybeSingle();
 if(error)return failed();
 if(!data)return NextResponse.json({error:"Categoría inexistente"},{status:404});
 return NextResponse.json(data);
}
export async function DELETE(req:Request){
 const auth=await adminOrError(req);if(auth)return auth;
 const body=await req.json().catch(()=>null);
 const id=uuid.safeParse(body?.id);
 if(!id.success)return invalidId();
 const db=privilegedDb();
 const {count,error:countError}=await db.from("products").select("id",{head:true,count:"exact"}).eq("category_id",id.data);
 if(countError)return failed();
 if((count??0)>0)return NextResponse.json({error:`La categoría tiene ${count} productos asignados. Reasignalos antes de eliminarla.`},{status:409});
 const {data,error}=await db.from("categories").delete().eq("id",id.data).select("id").maybeSingle();
 if(error)return failed();
 if(!data)return NextResponse.json({error:"Categoría inexistente"},{status:404});
 return NextResponse.json({ok:true});
}
