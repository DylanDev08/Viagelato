import {describe,expect,it} from "vitest";
import {matchesSavedProduct,normalizeProductWrite} from "@/lib/product-write";

const expected={
 name:"Mini torta Cookies",slug:"mini-torta-cookies",description:"Caja de 8 unidades",
 price:13900,stock:0,image_url:"/catalogo/mini-cookies.webp",category_id:null,
 sku:"COOKIE-8",presentation:"Caja x8",featured:false,
 commercially_verified:false,catalog_visible:false,active:false
};
const saved={id:"00000000-0000-4000-8000-000000000123",...expected,price:"13900.00"};

describe("verificación comercial del CRUD de productos",()=>{
 it("admite los decimales NUMERIC de Supabase y los campos opcionales vacíos",()=>{
  expect(matchesSavedProduct(saved,expected)).toBe(true);
  expect(normalizeProductWrite({...expected,sku:"   ",image_url:"  "})).toMatchObject({sku:null,image_url:null});
 });
 it("rechaza confirmaciones incompletas o valores no persistidos",()=>{
  for(const changed of [
   {name:"Mini torta incorrecta"},
   {slug:"mini-torta-otro"},
   {description:"Caja x6"},
   {sku:"COOKIE-6"},
   {presentation:"Caja x6"},
   {price:"15000.00"},
   {stock:5},
   {image_url:"/catalogo/otro.webp"},
   {active:true},
   {catalog_visible:true},
   {featured:true},
   {commercially_verified:true}
  ]){
   expect(matchesSavedProduct({...saved,...changed},expected)).toBe(false);
  }
  expect(matchesSavedProduct({price:13900},expected)).toBe(false);
 });
 it("acepta SKU vacío enviado como NULL sólo cuando estaba vacío",()=>{
  expect(matchesSavedProduct({...saved,sku:null},{...expected,sku:""})).toBe(true);
  expect(matchesSavedProduct({...saved,sku:null},expected)).toBe(false);
 });
});
