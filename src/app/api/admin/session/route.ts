import {NextResponse} from "next/server";
import {assertAdmin} from "@/lib/supabase";

export const dynamic="force-dynamic";
export async function GET(){
 try{
  await assertAdmin();
  return NextResponse.json({authorized:true},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({authorized:false},{status:401,headers:{"Cache-Control":"no-store"}});
 }
}
