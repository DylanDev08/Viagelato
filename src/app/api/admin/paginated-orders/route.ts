import {NextResponse} from "next/server";
import {adminOrError} from "@/lib/admin";
import {adminPageKind,decodeAdminCursor,loadAdminPage} from "@/lib/admin-pagination";

/** Solo lectura para admins; los datos nunca pasan por el cliente público. */
export async function GET(request:Request){
 const blocked=await adminOrError();
 if(blocked)return blocked;
 const url=new URL(request.url);
 const kind=adminPageKind.safeParse(url.searchParams.get("kind"));
 if(!kind.success)return NextResponse.json({error:"Tipo de listado inválido"},{status:400});
 let cursor;
 try{cursor=decodeAdminCursor(url.searchParams.get("cursor"));}catch{
  return NextResponse.json({error:"Cursor inválido"},{status:400});
 }
 try{
  const page=kind.data==="orders"?
   await loadAdminPage("orders",cursor):
   await loadAdminPage("whatsapp",cursor);
  return NextResponse.json(page,{headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
 }catch{
  return NextResponse.json({error:"No se pudieron cargar más pedidos"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
