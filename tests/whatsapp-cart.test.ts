import {describe,expect,it} from "vitest";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {PRICED_CART_PRODUCTS,catalogCartId,whatsappCartMessage} from "@/lib/whatsapp-cart";
import {whatsappHref} from "@/lib/whatsapp";

const base={name:"Ana Gomez",locality:"Lanús",address:"Av. Mitre 123",notes:"Tocar timbre",shippingMethod:"shipping" as const,freeShippingThreshold:60000};
describe("finalización por WhatsApp sin pasarela",()=>{
 it("incluye los 45 productos de Excel con SKU y precios por caja, aunque no haya stock cargado",()=>{
  expect(PRICED_CART_PRODUCTS).toHaveLength(45);
  expect(new Set(PRICED_CART_PRODUCTS.map(p=>p.id)).size).toBe(45);
  expect(PRICED_CART_PRODUCTS.every(x=>x.stock===null&&x.sku.startsWith("VIA-"))).toBe(true);
  expect(CATALOG_PRICE_ITEMS[0].price).toBe(21900);
  expect(catalogCartId(2)).toBe("catalog-price-2");
 });
 it("arma el pedido real para coordinar transferencia sin declararlo abonado",()=>{
  const text=whatsappCartMessage([{name:"Palitos",sku:"VIA-PAL-002-X36",presentation:"Caja de 36 unidades",price:21900,quantity:3}],base);
  expect(text).toContain("65.700");
  expect(text).toContain("VIA-PAL-002-X36");
  expect(text).toContain("Ana Gomez");
  expect(text).toContain("Av. Mitre 123");
  expect(text).toContain("Envío: gratis");
  expect(text).toContain("Total estimado de productos y envío");
  expect(text).toContain("no implica pago ni confirmación");
  const url=whatsappHref("+5491140962202",text);
  expect(decodeURIComponent(url||"")).toContain("Caja de 36 unidades");
 });
 it("no promete envío gratis por debajo del mínimo o fuera de zonas",()=>{
  const lines=[{name:"Torta",price:12900,quantity:1}];
  expect(whatsappCartMessage(lines,base)).toContain("pendiente de cotizar y confirmar cobertura");
  expect(whatsappCartMessage([{...lines[0],quantity:5}],{...base,locality:"CABA"})).toContain("pendiente de cotizar y confirmar cobertura");
 });
 it("no permite solicitudes vacías o cantidades incorrectas",()=>{
  expect(()=>whatsappCartMessage([],base)).toThrow("vacío");
  expect(()=>whatsappCartMessage([{name:"Torta",price:12900,quantity:0}],base)).toThrow("cantidades");
  expect(()=>whatsappCartMessage([{name:"Torta",price:12900,quantity:1}],{...base,name:""})).toThrow("nombre");
 });
 it("el retiro no se presenta como despacho gratuito",()=>{
  const text=whatsappCartMessage([{name:"Torta",price:12900,quantity:5}],{...base,shippingMethod:"pickup"});
  expect(text).toContain("Retiro (a confirmar)");
  expect(text).not.toContain("solicitar aplicación de envío sin cargo");
 });
});
