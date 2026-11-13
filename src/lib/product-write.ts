/**
 * La columna products.sku es UNIQUE en Postgres. Un SKU pendiente se
 * representa como NULL, no como "" (múltiples borradores sin SKU).
 */
export function normalizeProductWrite<T extends {sku?:string|null;image_url?:string|null}>(value:T):Omit<T,"sku"|"image_url"> & {sku:string|null;image_url:string|null}{
 return {...value,sku:value.sku?.trim()||null,image_url:value.image_url?.trim()||null};
}

/** El panel sólo confirma el guardado si la API devuelve los valores solicitados.
 * En Supabase los campos numeric pueden venir como string y los SKU vacíos como NULL.
 */
export type ExpectedProductWrite={
 name:string;slug:string;description:string;price:number;stock:number;
 sku?:string|null;presentation?:string|null;image_url?:string|null;
 category_id?:string|null;featured?:boolean;commercially_verified?:boolean;
 catalog_visible?:boolean;active:boolean;
};
export function matchesSavedProduct(saved:unknown,expected:ExpectedProductWrite):boolean{
 if(!saved||typeof saved!=="object"||Array.isArray(saved))return false;
 const actual=saved as Record<string,unknown>;
 if(typeof actual.id!=="string"||!actual.id)return false;
 const text=(value:unknown)=>typeof value==="string"?value.trim():"";
 for(const key of ["name","slug","description","sku","presentation","image_url","category_id"] as const){
  if(text(actual[key])!==text(expected[key]))return false;
 }
 if(!Number.isFinite(Number(actual.price))||Number(actual.price)!==expected.price)return false;
 if(!Number.isInteger(Number(actual.stock))||Number(actual.stock)!==expected.stock)return false;
 for(const key of ["active","catalog_visible","featured","commercially_verified"] as const){
  if(Boolean(actual[key])!==Boolean(expected[key]))return false;
 }
 return true;
}
