/**
 * Orígenes aceptados para escrituras del panel.
 *
 * En producción el navegador usa viagelato.vercel.app y /api/* se
 * reenvía a Render. Nunca confiar en x-forwarded-host del cliente.
 */
export function isAllowedAdminMutation(
 request:Request,
 siteUrl=process.env.NEXT_PUBLIC_SITE_URL,
 extraOrigins=process.env.ADMIN_ALLOWED_ORIGINS,
):boolean{
 const fetchSite=request.headers.get("sec-fetch-site");
 if(fetchSite==="cross-site")return false;

 const originHeader=request.headers.get("origin");
 // Los navegadores envían Origin en mutaciones. Sin él, negar por defecto.
 if(!originHeader)return false;
 let requestedOrigin:string;
 try{
  const origin=new URL(originHeader);
  if(origin.origin==="null" || origin.username || origin.password || origin.pathname!=="/" || origin.search || origin.hash)return false;
  requestedOrigin=origin.origin;
 }catch{return false;}

 const allowed=new Set<string>();
 for(const raw of [new URL(request.url).origin,siteUrl,...(extraOrigins?.split(",")??[])]){
  if(!raw)continue;
  try{
   const target=new URL(raw.trim());
   if((target.protocol==="https:"||target.hostname==="localhost"||target.hostname==="127.0.0.1")&&target.username===""&&target.password===""&&target.pathname==="/"&&!target.search&&!target.hash){
    allowed.add(target.origin);
   }
  }catch{ /* configuración inválida: nunca permitir por defecto */ }
 }
 return allowed.has(requestedOrigin);
}
