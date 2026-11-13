import {NextRequest,NextResponse} from "next/server";
import {isAllowedAdminMutation} from "@/lib/admin-origin";
import {adminLoginSession} from "@/lib/admin-login-session";
import {isServerAdminCookie} from "@/lib/admin-session-cookies";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 if(!isAllowedAdminMutation(request))return NextResponse.json({error:"Origen no permitido"},{
  status:403,headers:{"Cache-Control":"private, no-store"}
 });
 const session=adminLoginSession(request);
 if(request.cookies.getAll().some(item=>isServerAdminCookie(item.name))){
  // Only revoke this device. A logout must never invalidate other devices.
  try{await session.client.auth.signOut({scope:"local"});}catch{/* Clear browser cookies regardless of network errors. */}
 }
 session.clear();
 return session.response({signedOut:true});
}
