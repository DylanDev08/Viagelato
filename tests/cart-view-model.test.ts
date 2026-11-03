import {describe,expect,it} from "vitest";
import {resolveCartView} from "@/lib/cart-view-model";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {catalogCartId} from "@/lib/whatsapp-cart";

describe("modelo del carrito: catálogo y disponibilidad",()=>{
 const item=CATALOG_PRICE_ITEMS[0];
 it("calcula subtotales en centavos y cuenta presentaciones",()=>{
  const view=resolveCartView({items:[{id:catalogCartId(item.sourceRow),quantity:3}],products:[],catalogItems:[item]});
  expect(view.count).toBe(3);
  expect(view.subtotal).toBe(Math.round(item.price*100)*3/100);
  expect(view.missing).toBe(0);
  expect(view.unavailable).toBe(false);
 });
 it("no muestra líneas eliminadas y bloquea pedidos que perdieron productos",()=>{
  const view=resolveCartView({items:[{id:"missing",quantity:1}],products:[],catalogItems:[]});
  expect(view.lines).toHaveLength(0);
  expect(view.missing).toBe(1);
 });
 it("bloquea stock agotado e importes no válidos sin alterar las cantidades",()=>{
  const base={id:"abc",name:"Prueba",sku:null,description:"",slug:"prueba",price:200,stock:1,
   image_url:null,category_id:null,active:true,catalog_visible:false,commercially_verified:true};
  const view=resolveCartView({items:[{id:"abc",quantity:2}],products:[base],catalogItems:[]});
  expect(view.unavailable).toBe(true);
  expect(view.lines[0].quantity).toBe(2);
 });
});
