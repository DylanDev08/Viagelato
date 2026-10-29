import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "./catalog-prices";

/** Grupos reales de la planilla comercial. No altera SKUs, precios ni variantes. */
export const CATALOG_TYPES=[
 "Palitos y conos",
 "Alfajores helados",
 "Bombones helados",
 "Postres y especiales",
 "Tortas heladas",
 "Baldes y potes",
] as const;

export type CatalogGroup={name:string;items:CatalogPriceItem[];image:string|null;count:number};
export function groupCatalogByType(items:CatalogPriceItem[]):CatalogGroup[]{
 const unique=[...new Set(items.map(item=>item.category))];
 const ordered=[...CATALOG_TYPES.filter(name=>unique.includes(name)),...unique.filter(name=>!(CATALOG_TYPES as readonly string[]).includes(name)).sort((a,b)=>a.localeCompare(b,"es"))];
 return ordered.map(name=>{
  const groupItems=items.filter(item=>item.category===name);
  return {name,items:groupItems,image:groupItems.find(item=>item.image)?.image??null,count:groupItems.length};
 });
}

/** Un producto de cada categoría para no saturar la home con el catálogo completo. */
export function storefrontSamples(items:CatalogPriceItem[],limit=4):CatalogPriceItem[]{
 return groupCatalogByType(items).slice(0,limit).flatMap(group=>group.items.slice(0,1));
}
export const STORE_CATALOG_GROUPS=groupCatalogByType(CATALOG_PRICE_ITEMS);
export function categoryCatalogHref(category:string){
 return "/catalogo?tipo="+encodeURIComponent(category);
}
