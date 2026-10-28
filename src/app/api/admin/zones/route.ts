import {NextResponse} from "next/server";
import {adminOrError,zoneSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const failed=()=>NextResponse.json({error:"No se pudo guardar la zona"},{status:400});
export async function POST(req:Request){const auth=await adminOrError(req);if(auth)return auth;const p=zoneSchema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Zona inválida"},{status:400});const {data,error}=await privilegedDb().from("shipping_zones").insert(p.data).select().single();return error?failed():NextResponse.json(data);}
export async function PATCH(req:Request){const auth=await adminOrError(req);if(auth)return auth;const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Solicitud inválida"},{status:400});const {id,...payload}=body;if(typeof id!=="string")return NextResponse.json({error:"ID inválido"},{status:400});const p=zoneSchema.safeParse(payload);if(!p.success)return NextResponse.json({error:"Zona inválida"},{status:400});const {data,error}=await privilegedDb().from("shipping_zones").update(p.data).eq("id",id).select().single();return error?failed():NextResponse.json(data);}
export async function DELETE(req:Request){const auth=await adminOrError(req);if(auth)return auth;const {id}=(await req.json().catch(()=>({}))) as {id?:unknown};if(typeof id!=="string")return NextResponse.json({error:"ID inválido"},{status:400});const {error}=await privilegedDb().from("shipping_zones").update({active:false}).eq("id",id);return error?failed():NextResponse.json({ok:true});}
