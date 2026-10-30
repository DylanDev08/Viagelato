import {NextResponse} from "next/server";
import {assertAdmin,connected} from "@/lib/supabase";

export const dynamic="force-dynamic";
export async function GET(){
 if(!connected())return NextResponse.json({authorized:false,reason:"admin_unavailable"},{status:503,headers:{"Cache-Control":"private, no-store"}});
 try{
  const user=await assertAdmin();
  if(!user?.id)throw new Error("No autorizado");
  return NextResponse.json({authorized:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="No tenés permiso de administrador"?403:
   message==="No se pudo verificar el permiso administrativo"?503:401;
  return NextResponse.json({authorized:false},{status,headers:{"Cache-Control":"private, no-store"}});
 }
}
