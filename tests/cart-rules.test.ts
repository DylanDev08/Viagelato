import {describe,expect,it} from "vitest";
import {normalizeCartLines} from "@/lib/cart-rules";

describe("integridad del carrito restaurado",()=>{
 it("fusiona productos duplicados sin duplicar líneas ni pasar de 99",()=>{
  expect(normalizeCartLines([{id:"catalog-price-2",quantity:70},{id:"catalog-price-2",quantity:65},
    {id:"catalog-price-3",quantity:1}])).toEqual([
     {id:"catalog-price-2",quantity:99},{id:"catalog-price-3",quantity:1}
    ]);
 });
 it("omite registros malformados y limita el número de líneas",()=>{
  const items=[null,{}, {id:"",quantity:3},{id:"catalog-price-3",quantity:0},
   {id:"catalog-price-4",quantity:100},{id:"catalog-price-2",quantity:2},
   {id:"catalog-price-3",quantity:1},{id:"catalog-price-5",quantity:1}];
  expect(normalizeCartLines(items,2)).toEqual([{id:"catalog-price-2",quantity:2},{id:"catalog-price-3",quantity:1}]);
  expect(normalizeCartLines("texto")).toEqual([]);
 });
});
