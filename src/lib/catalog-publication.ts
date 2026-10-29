import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "./catalog-prices";

/**
 * Fase de transición: la planilla sigue visible hasta que un SKU sea revisado
 * por el administrador. Una vez verificado, la ficha administrada manda:
 * publicado -> datos nuevos; oculto -> no se muestra ni se puede pedir.
 * Nunca expone borradores ni inventa stock.
 */
export type CatalogAdminRow={
 sku:string|null;name:string;description:string;presentation:string|null;
 price:number|string;image_url:string|null;active:boolean;commercially_verified:boolean;
};
export function reconcilePublicCatalog(rows:readonly CatalogAdminRow[],source:readonly CatalogPriceItem[]=CATALOG_PRICE_ITEMS):CatalogPriceItem[]{
 const bySku=new Map<string,CatalogAdminRow>();
 for(const row of rows){
  const sku=row.sku?.trim().toUpperCase();
  if(sku)bySku.set(sku,row);
 }
 return source.flatMap(item=>{
  const row=bySku.get(item.sku.trim().toUpperCase());
  if(!row?.commercially_verified)return [item];
  const price=Number(row.price);
  if(!row.active||!Number.isFinite(price)||price<=0)return [];
  return [{
   ...item,
   name:row.name.trim()||item.name,
   description:row.description.trim()||item.description,
   presentation:row.presentation?.trim()||item.presentation,
   price,
   image:row.image_url?.trim()||item.image,
   imageStatus:row.image_url?.trim()?"coincidencia_exacta":item.imageStatus
  }];
 });
}
export function catalogHasSku(catalog:readonly Pick<CatalogPriceItem,"sku">[],sku:string|null|undefined){
 return Boolean(sku&&catalog.some(item=>item.sku.trim().toUpperCase()===sku.trim().toUpperCase()));
}
