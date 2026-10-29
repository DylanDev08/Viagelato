import "server-only";
import {cache} from "react";
import {CATALOG_PRICE_ITEMS} from "./catalog-prices";
import {catalogFromDatabase} from "./catalog-source-rules";
import {connected,privilegedDb} from "./supabase";

/** La planilla queda sólo como respaldo de pruebas / entorno sin Supabase.
 * Con Supabase conectado nunca se publican precios ni productos desde el JSON.
 * Los borradores sólo salen al cliente cuando catalog_visible=true.
 */
export const getPublicCatalog=cache(async()=>{
 if(!connected())return CATALOG_PRICE_ITEMS;
 const db=privilegedDb();
 const [products,categories]=await Promise.all([
  db.from("products").select("slug,name,description,sku,price,presentation,image_url,category_id,catalog_visible")
   .eq("catalog_visible",true).order("slug"),
  db.from("categories").select("id,name"),
 ]);
 if(products.error||categories.error)throw new Error("No se pudo consultar el catálogo comercial");
 return catalogFromDatabase(products.data||[],categories.data||[]);
});
