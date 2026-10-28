import type {MetadataRoute} from "next";
import {getStore} from "@/lib/site";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
 const {products}=await getStore();
 const staticRoutes=["","/catalogo","/productos","/nosotros","/envios","/contacto","/terminos","/politicas/privacidad","/politicas/devoluciones","/arrepentimiento"];
 return [
  ...staticRoutes.map(route=>({url:`${base}${route}`,changeFrequency:"weekly" as const,priority:route===""?1:.7})),
  ...products.map(product=>({url:`${base}/productos/${product.slug}`,changeFrequency:"weekly" as const,priority:.8})),
 ];
}
