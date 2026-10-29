import {describe,expect,it} from "vitest";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {catalogHasSku,reconcilePublicCatalog,type CatalogAdminRow} from "@/lib/catalog-publication";

const item=CATALOG_PRICE_ITEMS[0];
const row:CatalogAdminRow={
 sku:item.sku,name:"Nombre actualizado desde administración",description:"Descripción revisada por el comercio",
 presentation:"Caja revisada de 36 unidades",price:25000,image_url:"/catalogo/actualizado.webp",
 active:true,commercially_verified:true
};

describe("corte 01: reconciliación de catálogo sin publicaciones accidentales",()=>{
 it("mantiene 45 artículos de la planilla mientras no están validados",()=>{
  const items=reconcilePublicCatalog([{...row,commercially_verified:false}]);
  expect(items).toHaveLength(45);
  expect(items[0].price).toBe(item.price);
 });
 it("usa nombre, descripción, presentación, precio e imagen aprobados cuando se publica",()=>{
  const items=reconcilePublicCatalog([row]);
  expect(items).toHaveLength(45);
  expect(items[0]).toMatchObject({sourceRow:item.sourceRow,sku:item.sku,name:row.name,description:row.description,presentation:row.presentation,price:25000,image:row.image_url});
 });
 it("oculta el SKU verificado si administración lo despublica; no vuelve al precio viejo",()=>{
  const items=reconcilePublicCatalog([{...row,active:false}]);
  expect(items).toHaveLength(44);
  expect(items.find(candidate=>candidate.sku===item.sku)).toBeUndefined();
 });
 it("no publica precios cero, negativos ni desconocidos aunque estén activos",()=>{
  expect(reconcilePublicCatalog([{...row,price:0}])).toHaveLength(44);
  expect(reconcilePublicCatalog([{...row,price:"no válido"}])).toHaveLength(44);
 });
 it("reconcilia por SKU y no por título, id o posición; evita colisiones",()=>{
  const items=reconcilePublicCatalog([{...row,sku:"  "+item.sku.toLowerCase()+"  "}]);
  expect(items[0].price).toBe(25000);
  expect(catalogHasSku(CATALOG_PRICE_ITEMS,item.sku)).toBe(true);
  expect(catalogHasSku(CATALOG_PRICE_ITEMS,"VIA-NUEVO-123")).toBe(false);
  expect(new Set(items.map(candidate=>candidate.sourceRow)).size).toBe(items.length);
 });
 it("mantiene SKU nuevos para presentarlos en la sección de novedades, sin incluirlos en los 45 históricos",()=>{
  const items=reconcilePublicCatalog([{...row,sku:"VIA-NUEVO-123"}]);
  expect(items).toHaveLength(45);
  expect(items[0].price).toBe(item.price);
 });
});
