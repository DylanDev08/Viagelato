import {createHash,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {connected,privilegedDb} from "@/lib/supabase";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
const reply=(status:number,error:string)=>NextResponse.json({error},{status,headers});

/** Compare digests in constant time. Never log the supplied bearer token. */
export function matchesCronSecret(received:string|null,secret:string):boolean{
 const digest=(value:string)=>createHash("sha256").update(value).digest();
 return Boolean(secret)&&timingSafeEqual(
  digest(received??""),digest("Bearer "+secret)
 );
}
export async function POST(request:Request){
 if(!connected()||!process.env.CRON_SECRET)return reply(503,"Servicio no configurado");
 if(!matchesCronSecret(request.headers.get("authorization"),process.env.CRON_SECRET))return reply(401,"No autorizado");
 try{
  const {data,error}=await privilegedDb().rpc("release_expired_order_reservations",{p_limit:250});
  return error?reply(500,"No se pudieron liberar las reservas"):
   NextResponse.json({released:Number(data)},{headers});
 }catch{return reply(503,"No se pudo ejecutar la tarea");}
}
