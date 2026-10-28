import {describe,expect,it} from "vitest";
import {productSchema} from "@/lib/admin-rules";
import {normalizeProductWrite} from "@/lib/product-write";
import {draftFromCatalogCandidate} from "@/lib/catalog-draft";
import {PROVISIONAL_PRODUCT_ASSETS,PROVISIONAL_BRAND_ASSETS} from "@/lib/provisional-catalog";

describe("borradores del catálogo Viagelato",()=>{
 it("normaliza SKU pendiente a null, permitiendo múltiples borradores sin SKU único",()=>{
  const a=normalizeProductWrite({sku:"",image_url:"/catalogo/prueba.webp"});
  const b=normalizeProductWrite({sku:"   ",image_url:null});
  expect(a.sku).toBeNull();
  expect(b.sku).toBeNull();
  expect(normalizeProductWrite({sku:" COD-01 ",image_url:""}).sku).toBe("COD-01");
  expect(b.image_url).toBeNull();
 });
 it("prepara productos candidatos sin inventar campos comerciales",()=>{
  const asset=PROVISIONAL_PRODUCT_ASSETS[0];
  expect(asset).toBeDefined();
  const draft=draftFromCatalogCandidate(asset,[]);
  expect(draft.name).toBe(asset.name);
  expect(draft.image_url).toBe(asset.image);
  expect(draft.price).toBe(0);
  expect(draft.stock).toBe(0);
  expect(draft.sku).toBe("");
  expect(draft.description).toBe("");
  expect(draft.commercially_verified).toBe(false);
  expect(draft.active).toBe(false);
  expect(productSchema.safeParse(draft).success).toBe(true);
  expect(productSchema.safeParse({...draft,active:true}).success).toBe(false);
 });
 it("usa ID en slug para distinguir fotos con nombre similar",()=>{
  const asset=PROVISIONAL_PRODUCT_ASSETS[0];
  const second={...asset,id:asset.id+1};
  expect(draftFromCatalogCandidate(asset,[]).slug).not.toBe(draftFromCatalogCandidate(second,[]).slug);
 });
 it("asigna categoría solamente si ya existe una coincidencia exacta",()=>{
  const asset=PROVISIONAL_PRODUCT_ASSETS[0];
  const category={id:"20000000-0000-4000-8000-000000000001",name:asset.category.toUpperCase()};
  expect(draftFromCatalogCandidate(asset,[category]).category_id).toBe(category.id);
  expect(draftFromCatalogCandidate(asset,[]).category_id).toBeNull();
 });
 it("impide transformar logos y materiales de marca en productos",()=>{
  const logo=PROVISIONAL_BRAND_ASSETS[0];
  expect(logo).toBeDefined();
  expect(()=>draftFromCatalogCandidate(logo,[])).toThrow();
 });
});
