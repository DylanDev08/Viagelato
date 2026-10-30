import {NextResponse} from "next/server";
import {assertAdmin,privilegedDb} from "@/lib/supabase";
export const dynamic="force-dynamic";
function localDay(){
 const parts=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date());
 const read=(name:string)=>parts.find(part=>part.type===name)?.value??"";
 return [read("year"),read("month"),read("day")].join("-");
}
function validDay(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+"T12:00:00Z");
 return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export async function GET(request:Request){
 let admin;
 try{admin=await assertAdmin();}catch{
  return NextResponse.json({error:"No autorizado"},{status:401,headers:{"Cache-Control":"private, no-store"}});
 }
 const day=new URL(request.url).searchParams.get("day")??localDay();
 if(!validDay(day))return NextResponse.json({error:"Fecha inválida"},{status:400});
 const {data,error}=await privilegedDb().rpc("admin_whatsapp_daily_summary",{
  p_day:day,p_actor_user_id:admin.id
 });
 if(error||!data)return NextResponse.json({error:"No se pudo consultar el resumen diario. Revisá la migración de la base de datos."},{status:503,headers:{"Cache-Control":"private, no-store"}});
 return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
}
