import "server-only";

export type TurnstileAction="admin_login"|"whatsapp_request";
export type TurnstileDecision={ok:true}|{ok:false;reason:"configuration"|"invalid"|"unavailable"};

/**
 * No se activan desafíos de demostración en producción. La protección se activa
 * exclusivamente con las dos claves reales de Cloudflare configuradas en Vercel.
 * Si falta una de las dos, cerramos el acceso al formulario protegido.
 */
export function turnstileEnabled(){
 return Boolean(process.env.TURNSTILE_SECRET_KEY||process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}
function hostnames(){
 const allowed=new Set<string>(["viagelato.vercel.app"]);
 const site=process.env.NEXT_PUBLIC_SITE_URL;
 if(site){try{const u=new URL(site);if(u.protocol==="https:")allowed.add(u.hostname.toLowerCase());}catch{}}
 for(const item of (process.env.TURNSTILE_ALLOWED_HOSTNAMES??"").split(",")){
  const host=item.trim().toLowerCase();
  if(/^[a-z0-9.-]+$/.test(host)&&host.includes(".")&&!host.startsWith(".")&&!host.endsWith("."))allowed.add(host);
 }
 return allowed;
}
/** Cloudflare Siteverify: el token es de un solo uso y vence a los 5 minutos. */
export async function verifyTurnstile(token:unknown,action:TurnstileAction):Promise<TurnstileDecision>{
 const secret=process.env.TURNSTILE_SECRET_KEY?.trim();
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
 if(!secret&&!siteKey)return {ok:true}; // activación pendiente; no simular protección
 if(!secret||!siteKey)return {ok:false,reason:"configuration"};
 if(typeof token!=="string"||token.length<1||token.length>2048)return {ok:false,reason:"invalid"};
 try{
  const form=new URLSearchParams({secret,response:token});
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
   method:"POST",body:form,
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   cache:"no-store",signal:AbortSignal.timeout(6000),
  });
  if(!response.ok)return {ok:false,reason:"unavailable"};
  const result:unknown=await response.json();
  if(!result||typeof result!=="object")return {ok:false,reason:"invalid"};
  const data=result as Record<string,unknown>;
  if(data.success!==true||data.action!==action||
   typeof data.hostname!=="string"||!hostnames().has(data.hostname.toLowerCase())){
   return {ok:false,reason:"invalid"};
  }
  return {ok:true};
 }catch{
  return {ok:false,reason:"unavailable"};
 }
}
