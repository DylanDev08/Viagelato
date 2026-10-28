/**
 * La columna products.sku es UNIQUE en Postgres. Un SKU pendiente se
 * representa como NULL, no como "" (múltiples borradores sin SKU).
 */
export function normalizeProductWrite<T extends {sku?:string|null;image_url?:string|null}>(value:T):T & {sku:string|null;image_url:string|null}{
 return {...value,sku:value.sku?.trim()||null,image_url:value.image_url?.trim()||null};
}
