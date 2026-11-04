import {cache} from "react";
import {publicDb} from "./supabase";

/**
 * La consulta pública de categorías no contiene credenciales ni datos privados.
 * Compartirla por request entre catálogo y tienda evita lecturas duplicadas
 * sin cachear precios o inventario entre pedidos.
 */
export const readPublicCategories=cache(async()=>
 publicDb().from("categories").select("*").order("name")
);
