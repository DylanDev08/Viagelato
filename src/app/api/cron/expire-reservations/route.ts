import {NextResponse} from "next/server";
import {connected,privilegedDb} from "@/lib/supabase";

export const runtime="nodejs";
export async function POST(request:Request){
 if(!connected()||!process.env.CRON_SECRET)return NextResponse.json({error:"Servicio no configurado"},{status:503});
 if(request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"No autorizado"},{status:401});
 const {data,error}=await privilegedDb().rpc("release_expired_order_reservations",{p_limit:250});
 return error?NextResponse.json({error:"No se pudieron liberar las reservas"},{status:500}):NextResponse.json({released:Number(data)});
}
