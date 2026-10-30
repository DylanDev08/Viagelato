/**
 * CSRF / Fetch Metadata guard shared by the admin and public checkout.
 * Never trust request.url or forwarded host as an authorization source: both
 * can reflect an untrusted Host header behind a proxy.
 *
 * Custom domains / previews must be explicitly configured in
 * NEXT_PUBLIC_SITE_URL, ADMIN_ALLOWED_ORIGINS or the supplied extraOrigins.
 */
const officialOrigins=["https://viagelato.vercel.app","https://viagelato-api.onrender.com"] as const;

function parseOrigin(raw:string):string|null{
 try{
  const url=new URL(raw.trim());
  if(url.origin==="null"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)return null;
  const local=url.hostname==="localhost"||url.hostname==="127.0.0.1";
  if(url.protocol!=="https:"&&!(local&&url.protocol==="http:"))return null;
  // Localhost must never be an allowed origin in deployed production.
  if(local&&process.env.NODE_ENV==="production")return null;
  return url.origin;
 }catch{return null;}
}

export function isAllowedAdminMutation(
 request:Request,
 siteUrl=process.env.NEXT_PUBLIC_SITE_URL,
 extraOrigins=process.env.ADMIN_ALLOWED_ORIGINS,
):boolean{
 const fetchSite=request.headers.get("sec-fetch-site");
 if(fetchSite==="cross-site")return false;

 const rawOrigin=request.headers.get("origin");
 if(!rawOrigin)return false;
 const requestedOrigin=parseOrigin(rawOrigin);
 if(!requestedOrigin)return false;

 const configured=[siteUrl,...(extraOrigins?.split(",")??[])];
 const allowed=new Set([...officialOrigins,...configured].map(raw=>raw?parseOrigin(raw):null).filter((v):v is string=>v!==null));
 // Local same-origin development requests work only outside production.
 if(process.env.NODE_ENV!=="production"){
  allowed.add("http://localhost:3000");
  allowed.add("http://127.0.0.1:3000");
 }
 return allowed.has(requestedOrigin);
}
