import {createHmac,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {assertAdmin,privilegedDb} from "./supabase";
import {isAllowedAdminMutation} from "./admin-origin";
export {bannerSchema,productSchema,settingsSchema,zoneSchema} from "./admin-rules";

const privateHeaders={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
function denied(status:number,error:string,retrySeconds?:number){
 const reply=NextResponse.json({error},{status,headers:privateHeaders});
 if(retrySeconds)reply.headers.set("Retry-After",String(retrySeconds));
 return reply;
}
export function adminRequestError(request:Request){
 if(!isAllowedAdminMutation(request))return denied(403,"Origen no permitido");
 return null;
}

/**
 * Distributed, atomic throttle backed by the existing restricted Postgres RPC.
 * Per admin account AND route: untrusted forwarded IP headers cannot evade it.
 * The identifier is HMACed before storing it, never saving the admin email/ID
 * or the server secret as plaintext in checkout_attempts.
 */
export async function adminMutationRateLimit(request:Request,userId:string):Promise<NextResponse|null>{
 if(!["POST","PUT","PATCH","DELETE"].includes(request.method))return null;
 const salt=process.env.CHECKOUT_RATE_LIMIT_SALT;
 if(!salt||Buffer.byteLength(salt,"utf8")<32)return denied(503,"Control de seguridad no configurado");
 const pathname=new URL(request.url).pathname;
 const max=pathname==="/api/admin/upload"?20:
  pathname==="/api/admin/orders"||pathname==="/api/admin/whatsapp-requests"?40:80;
 const digest=createHmac("sha256",salt)
  .update("admin-mutation:v1:"+userId+":"+pathname).digest("hex");
 try{
  const {data,error}=await privilegedDb().rpc("consume_checkout_attempt",{
   p_key_hash:digest,p_idempotency_key:randomUUID(),p_limit:max,p_window_minutes:10
  });
  if(error||typeof data!=="boolean")return denied(503,"No se pudo verificar el límite de solicitudes");
  if(!data)return denied(429,"Demasiadas operaciones. Probá en unos minutos.",600);
  return null;
 }catch{
  return denied(503,"No se pudo verificar el límite de solicitudes");
 }
}

export async function adminOrError(request?:Request){
 if(request){const originError=adminRequestError(request);if(originError)return originError;}
 try{
  const user=await assertAdmin();
  if(request)return await adminMutationRateLimit(request,user.id);
  return null;
 }catch{return denied(401,"No autorizado");}
}
