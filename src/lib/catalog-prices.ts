import priceSource from "../../docs/viagelato/catalogo_precios_20261028.json";
export type CatalogPriceItem={
 sourceRow:number;id:number;price:number;name:string;category:string;sku:string;
 presentation:string;variants:string;description:string;image:string|null;
 imageStatus:"coincidencia_exacta"|"referencial"|"sin_foto";sourceDriveId:string|null;
};
export const CATALOG_PRICE_ITEMS:CatalogPriceItem[]=priceSource.products as CatalogPriceItem[];
export const CATALOG_SOURCE_LABEL="Precio final por presentación. Consultá disponibilidad y condiciones de entrega por WhatsApp.";
export const findCatalogPriceItem=(id:number)=>CATALOG_PRICE_ITEMS.find(item=>item.id===id)??null;
