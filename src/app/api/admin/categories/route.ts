import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const schema=z.object({name:z.string().trim().min(2).max(100),slug:z.string().regex(/^[a-z0-9-]{2,100}$/)});
const failed=()=>NextResponse.json({error:"No se pudo guardar la categoría"},{status:400});
export async function POST(req:Request){const auth=await adminOrError(req);if(auth)return auth;const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Categoría inválida"},{status:400});const {data,error}=await privilegedDb().from("categories").insert(p.data).select().single();return error?failed():NextResponse.json(data);}
export async function DELETE(req:Request){const auth=await adminOrError(req);if(auth)return auth;const {id}=(await req.json().catch(()=>({}))) as {id?:unknown};if(typeof id!=="string")return NextResponse.json({error:"ID inválido"},{status:400});const {error}=await privilegedDb().from("categories").delete().eq("id",id);return error?failed():NextResponse.json({ok:true});}
export async function PATCH(req:Request){const auth=await adminOrError(req);if(auth)return auth;const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Solicitud inválida"},{status:400});const {id,...payload}=body;if(typeof id!=="string")return NextResponse.json({error:"ID inválido"},{status:400});const parsed=schema.safeParse(payload);if(!parsed.success)return NextResponse.json({error:"Categoría inválida"},{status:400});const {data,error}=await privilegedDb().from("categories").update(parsed.data).eq("id",id).select().single();return error?failed():NextResponse.json(data);}
