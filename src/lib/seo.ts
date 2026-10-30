export const PRIVATE_ROUTES=["/admin","/api","/login","/recuperar-acceso","/actualizar-contrasena","/carrito","/catalogo/vista"];

export function publicSiteUrl(value=process.env.NEXT_PUBLIC_SITE_URL):string|null{
 try{
  const url=new URL(value??"");
  if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash||
   url.hostname==="localhost"||url.hostname==="127.0.0.1"||url.hostname==="[::1]")return null;
  return url.origin;
 }catch{return null;}
}

export const serializeJsonLd=(value:unknown)=>JSON.stringify(value).replace(/</g,"\\u003c");
