import {createHash,randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {connected,privilegedDb} from "@/lib/supabase";
import {adminLoginSession} from "@/lib/admin-login-session";
import {serverAdminLoginAvailable} from "@/lib/admin-session-cookies";
import {rateLimitClientKey} from "@/lib/request-security";
import {readJsonBody,RequestBodyError} from "@/lib/request-body";
import {isAllowedAdminMutation} from "@/lib/admin-origin";
import {verifyTurnstile} from "@/lib/turnstile";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const schema=z.object({
 email:z.email().max(254),
 password:z.string().min(1).max(1024),
 turnstile_token:z.string().max(2048).optional(),
}).strict();
const response=(status:number,error:string)=>NextResponse.json(
 {error},{status,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}}
);

export async function POST(request:NextRequest){
 // Server canary is independently enabled. Existing browser login stays
 // available until an authenticated production session has been verified.
 if(!serverAdminLoginAvailable())return response(503,"El acceso por servidor está deshabilitado.");
 if(!isAllowedAdminMutation(request))return response(403,"Origen no permitido");
 if(!connected())return response(503,"Acceso administrativo temporalmente no disponible");
 let raw:unknown;
 try{raw=await readJsonBody(request);}catch(error){
  if(error instanceof RequestBodyError)return response(error.status,"Solicitud inválida");
  return response(400,"Solicitud inválida");
 }
 const input=schema.safeParse(raw);
 if(!input.success)return response(400,"Datos de acceso inválidos");
 const salt=process.env.CHECKOUT_RATE_LIMIT_SALT;
 if(!salt||Buffer.byteLength(salt,"utf8")<32)return response(503,"No se pudo verificar el acceso");
 const db=privilegedDb();
 const key=createHash("sha256").update("admin-login:"+rateLimitClientKey(request,salt)).digest("hex");
 const {data:allowed,error:limitError}=await db.rpc("consume_checkout_attempt",{
  p_key_hash:key,p_idempotency_key:randomUUID(),p_limit:5,p_window_minutes:15
 });
 if(limitError||typeof allowed!=="boolean")return response(503,"No se pudo verificar el acceso");
 if(!allowed){
  const denied=response(429,"Demasiados intentos. Probá más tarde.");
  denied.headers.set("Retry-After","900");
  return denied;
 }
 const challenge=await verifyTurnstile(input.data.turnstile_token,"admin_login");
 if(!challenge.ok)return response(challenge.reason==="configuration"||challenge.reason==="unavailable"?503:403,
  "No pudimos completar la verificación de seguridad.");

 try{
  // Supabase Auth creates a dedicated server session in HttpOnly cookies.
  // The password and tokens never appear in the response JSON.
  const session=adminLoginSession(request);
  const {data,error}=await session.client.auth.signInWithPassword({
   email:input.data.email.trim().toLowerCase(),password:input.data.password
  });
  if(error||!data.user)return response(401,"Email o contraseña incorrectos");
  // Never authorize a role from a browser claim or raw request payload.
  const verified=await session.client.auth.getUser();
  if(verified.error||verified.data.user?.id!==data.user.id){
   await session.client.auth.signOut({scope:"local"}).catch(()=>{});
   session.clear();
   return session.response({error:"No se pudo verificar la identidad"},401);
  }
  const {data:admin,error:roleError}=await db.from("admin_users")
   .select("user_id").eq("user_id",data.user.id).maybeSingle();
  if(roleError||!admin){
   await session.client.auth.signOut({scope:"local"}).catch(()=>{});
   session.clear();
   return session.response({error:"No se pudo autorizar el acceso"},401);
  }
  return session.response({authorized:true});
 }catch{
  return response(503,"No pudimos verificar el acceso. Intentá nuevamente.");
 }
}
