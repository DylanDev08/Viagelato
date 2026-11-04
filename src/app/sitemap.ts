import type {MetadataRoute} from "next";
import {getStore} from "@/lib/site";
import {getPublicCatalog} from "@/lib/catalog-source";
import {publicSiteUrl} from "@/lib/seo";

export const dynamic="force-dynamic";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=publicSiteUrl();
 if(!base||process.env.ENABLE_INDEXING!=="true")return [];
 const [{products},catalog]=await Promise.all([getStore(),getPublicCatalog()]);
 const staticRoutes=["","/catalogo","/nosotros","/envios","/contacto","/terminos","/politicas/privacidad","/politicas/devoluciones","/arrepentimiento"];
 return [
  ...staticRoutes.map(route=>({url:`${base}${route}`,changeFrequency:"weekly" as const,priority:route===""?1:.7})),
  ...products.map(product=>({url:`${base}/productos/${encodeURIComponent(product.slug)}`,changeFrequency:"weekly" as const,priority:.8})),
  ...catalog.map(item=>({url:`${base}/catalogo/vista/${item.id}`,changeFrequency:"weekly" as const,priority:.7})),
 ];
}
