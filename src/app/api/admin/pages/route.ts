import {NextResponse} from "next/server";
import {assertAdmin} from "@/lib/supabase";
import {loadAdminPage,type AdminPageKind} from "@/lib/admin-pages";

export const dynamic="force-dynamic";
export const runtime="nodejs";

export async function GET(req:Request){
 // GET del propio panel no lleva necesariamente Origin; las mutaciones
 // continúan usando el guard CSRF de adminOrError.
 if(req.headers.get("sec-fetch-site")==="cross-site")
  return NextResponse.json({error:"Origen no permitido"},{status:403});
 try{await assertAdmin();}
 catch{return NextResponse.json({error:"No autorizado"},{status:401});}
 const search=new URL(req.url).searchParams;
 const kind=search.get("kind");
 if(kind!=="orders"&&kind!=="requests")
  return NextResponse.json({error:"Tipo de pedido inválido"},{status:400});
 const cursor=search.get("cursor");
 if(cursor!==null&&cursor.length>256)
  return NextResponse.json({error:"Cursor inválido"},{status:400});
 try{
  const result=await loadAdminPage(kind as AdminPageKind,cursor);
  return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  if(error instanceof Error&&error.message==="Cursor inválido")
   return NextResponse.json({error:"Cursor inválido"},{status:400});
  return NextResponse.json({error:"No se pudieron cargar más pedidos"},{status:503});
 }
}
