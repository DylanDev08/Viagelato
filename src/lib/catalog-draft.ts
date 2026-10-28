import type {Category,Product} from "@/lib/types";
import type {ProvisionalAsset} from "@/lib/provisional-catalog";
import {normalizeCatalogText} from "./catalog-search";

export type CandidateProductDraft=Pick<Product,
 "name"|"slug"|"description"|"price"|"stock"|"image_url"|"category_id"|"sku"|"presentation"|"featured"|"commercially_verified"|"active"
> & {id?:string};

/**
 * Usa exclusivamente la foto y el nombre tentativo.
 * No inventa precio, SKU, stock, descripción ni verificación comercial.
 * El sufijo ID evita choques de slug entre nombres comerciales parecidos.
 */
export function draftFromCatalogCandidate(asset:ProvisionalAsset,categories:Pick<Category,"id"|"name">[]):CandidateProductDraft{
 if(asset.role!=="producto_candidato")throw new Error("Los materiales de marca no son productos");
 const name=asset.name.trim().slice(0,160);
 const base=normalizeCatalogText(name).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,138).replace(/-+$/,"")||"producto";
 const category=categories.find(c=>normalizeCatalogText(c.name)===normalizeCatalogText(asset.category));
 return {
  name,
  slug:`${base}-ref-${asset.id}`,
  description:"",price:0,stock:0,image_url:asset.image,
  category_id:category?.id??null,sku:"",presentation:"",
  featured:false,commercially_verified:false,active:false
 };
}
