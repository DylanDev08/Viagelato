import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "./catalog-prices";
import type {Category} from "./types";

export type CatalogDbRow={
 slug:string;name:string;description:string;sku:string|null;price:number|string;
 presentation:string|null;image_url:string|null;category_id:string|null;
 catalog_visible:boolean;
};

/** Identificadores estables de la planilla; campos comerciales siempre provenientes de Supabase. */
export function catalogFromDatabase(rows:CatalogDbRow[],categories:Pick<Category,"id"|"name">[]):CatalogPriceItem[]{
 const originals=new Map(CATALOG_PRICE_ITEMS.map(item=>[item.sourceRow,item]));
 const names=new Map(categories.map(category=>[category.id,category.name]));
 const collected:CatalogPriceItem[]=[];
 for(const record of rows){
  if(!record.catalog_visible)continue;
  const match=/^excel-fila-([1-9][0-9]*)$/.exec(record.slug);
  if(!match)continue;
  const original=originals.get(Number(match[1]));
  const price=Number(record.price);
  if(!original||!Number.isFinite(price)||price<=0||!record.sku?.trim())continue;
  const photo=record.image_url?.trim()||null;
  collected.push({
   ...original,name:record.name,description:record.description,sku:record.sku,
   price,presentation:record.presentation||original.presentation,
   category:(record.category_id&&names.get(record.category_id))||original.category,
   image:photo,imageStatus:photo?"coincidencia_exacta":"sin_foto",
  });
 }
 return collected.sort((a,b)=>a.sourceRow-b.sourceRow);
}
