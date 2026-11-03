import "server-only";
import {cache} from "react";
import {CATALOG_PRICE_ITEMS} from "./catalog-prices";
import {catalogFromDatabase} from "./catalog-source-rules";
import {connected,privilegedDb,publicConnected,publicDb} from "./supabase";
import {readPublicCategories} from "./public-categories";

/** La planilla queda sólo como respaldo de pruebas / entorno sin Supabase.
 * Con Supabase conectado nunca se publican precios ni productos desde el JSON.
 * Los borradores sólo salen al cliente cuando catalog_visible=true.
 */
export const getPublicCatalog=cache(async()=>{
 if(!publicConnected()){
  // El JSON histórico sólo es un fixture local; jamás publicar precios antiguos en producción.
  if(process.env.NODE_ENV==="production")throw new Error("No se pudo consultar el catálogo comercial vigente.");
  return CATALOG_PRICE_ITEMS;
 }
 // Activación gradual: la vista con SECURITY INVOKER y su política RLS se
 // deben desplegar y validar ANTES de habilitar esta bandera en Vercel.
 // Si está habilitada, no utilizar nunca la clave privilegiada como fallback.
 const publicView=process.env.PUBLIC_CATALOG_READ_MODEL==="true";
 if(!publicView&&!connected())throw new Error("La fuente comercial no está disponible.");
 const db=publicView?publicDb():privilegedDb();
 const [products,categories]=await Promise.all([
  publicView
   ?db.from("catalog_public").select("slug,name,description,sku,price,presentation,image_url,category_id,catalog_visible").order("slug")
   :db.from("products").select("slug,name,description,sku,price,presentation,image_url,category_id,catalog_visible")
     .eq("catalog_visible",true).order("slug"),
  readPublicCategories(),
 ]);
 if(products.error||categories.error)throw new Error("No se pudo consultar el catálogo comercial");
 return catalogFromDatabase(products.data||[],categories.data||[]);
});
