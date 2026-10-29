import priceSource from "../../docs/viagelato/catalogo_precios_20261028.json";
export type CatalogPriceItem={
 sourceRow:number;id:number;price:number;name:string;category:string;sku:string;
 presentation:string;variants:string;description:string;image:string|null;
 imageStatus:"coincidencia_exacta"|"referencial"|"sin_foto";sourceDriveId:string|null;
};
export const CATALOG_PRICE_ITEMS:CatalogPriceItem[]=priceSource.products as CatalogPriceItem[];
export const CATALOG_SOURCE_LABEL="Precios finales por presentación según planilla de Viagelato recibida el 28/10/2026.";
export const findCatalogPriceItem=(id:number)=>CATALOG_PRICE_ITEMS.find(item=>item.id===id)??null;
