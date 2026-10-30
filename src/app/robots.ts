import type {MetadataRoute} from "next";
import {PRIVATE_ROUTES,publicSiteUrl} from "@/lib/seo";

export default function robots():MetadataRoute.Robots{
 const base=publicSiteUrl();
 const indexingEnabled=process.env.ENABLE_INDEXING==="true"&&base!==null;
 return indexingEnabled
  ? {rules:[{userAgent:"*",allow:"/",disallow:PRIVATE_ROUTES}],sitemap:`${base}/sitemap.xml`}
  : {rules:[{userAgent:"*",disallow:"/"}]};
}
