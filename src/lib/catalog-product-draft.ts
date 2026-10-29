import type {CatalogPriceItem} from "./catalog-prices";
import type {Category} from "./types";
import {normalizeCatalogText} from "./catalog-search";
import type {CandidateProductDraft} from "./catalog-draft";

/** Precompleta solo datos reales de la planilla. Nunca asume stock ni autoriza publicar. */
export function draftFromPricedCatalog(item:CatalogPriceItem,categories:Pick<Category,"id"|"name">[]):CandidateProductDraft{
 const category=categories.find(c=>normalizeCatalogText(c.name)===normalizeCatalogText(item.category));
 const name=item.name.trim().slice(0,160);
 const slugBase=normalizeCatalogText(name).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,135).replace(/-+$/g,"");
 return {
  name,slug:`${slugBase||"producto"}-via-${item.sourceRow}`,
  description:item.description.slice(0,2000),
  price:item.price,
  stock:0,
  image_url:item.image,
  category_id:category?.id??null,
  sku:item.sku,
  presentation:item.presentation,
  featured:false,
  commercially_verified:false,
  active:false
 };
}
