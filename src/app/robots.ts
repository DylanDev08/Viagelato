import type {MetadataRoute} from "next";

export default function robots():MetadataRoute.Robots{
 const base=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
 const indexingEnabled=process.env.ENABLE_INDEXING==="true";
 return indexingEnabled
  ? {rules:[{userAgent:"*",allow:"/",disallow:["/admin","/api","/login","/recuperar-acceso","/actualizar-contrasena","/carrito"]}],sitemap:`${base}/sitemap.xml`}
  : {rules:[{userAgent:"*",disallow:"/"}]};
}
