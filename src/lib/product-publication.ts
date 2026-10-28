/** Criterios compartidos entre el formulario y las reglas de publicación. */
export type ProductForPublication={
 sku?:string|null;
 price:number;
 image_url?:string|null;
 description?:string|null;
 commercially_verified?:boolean;
};
export function publicationMissingFields(value:ProductForPublication):string[]{
 const missing:string[]=[];
 if(!value.sku?.trim())missing.push("SKU");
 if(!Number.isFinite(value.price)||value.price<=0)missing.push("precio mayor a $0");
 if(!value.image_url?.trim())missing.push("imagen");
 if((value.description??"").trim().length<20)missing.push("descripción de al menos 20 caracteres");
 if(!value.commercially_verified)missing.push("verificación comercial");
 return missing;
}
