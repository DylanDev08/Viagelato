import {describe,expect,it} from "vitest";
import {quoteShipping} from "@/lib/shipping-quote";
import type {ShippingZone} from "@/lib/types";

const activeZone=(name:string,cost:number,freeShippingEligible=true):ShippingZone=>({
 id:"00000000-0000-4000-8000-000000000023",name,postal_codes:[],cost,
 active:true,ready:true,free_shipping_eligible:freeShippingEligible
});
const base={subtotal:21900,locality:"Lanús",method:"shipping" as const,freeShippingThreshold:60000,zones:[] as ShippingZone[]};
describe("cotización de entrega en carrito y WhatsApp",()=>{
 it("siempre conserva el total de productos cuando no se conoce la tarifa",()=>{
  expect(quoteShipping(base)).toEqual({kind:"pending",covered:true,shippingCost:null,total:null});
  expect(quoteShipping({...base,locality:"Quilmes Oeste"})).toEqual({kind:"pending",covered:false,shippingCost:null,total:null});
  expect(quoteShipping({...base,locality:""}).kind).toBe("unselected");
 });
 it("aplica envío gratis solamente con localidad elegible y compra desde el mínimo",()=>{
  expect(quoteShipping({...base,subtotal:65700})).toEqual({kind:"free",covered:true,shippingCost:0,total:65700});
  expect(quoteShipping({...base,subtotal:65700,locality:"Quilmes Oeste"}).total).toBeNull();
  expect(quoteShipping({...base,subtotal:59999.99}).shippingCost).toBeNull();
  expect(quoteShipping({...base,subtotal:65700,locality:"LANUS"}).kind).toBe("free");
 });
 it("suma tarifa activa al subtotal y descarta zonas no habilitadas",()=>{
  const zone=activeZone("Lanús",4500);
  expect(quoteShipping({...base,zones:[zone]})).toEqual({kind:"priced",covered:true,shippingCost:4500,total:26400});
  expect(quoteShipping({...base,zones:[{...zone,active:false}]}).total).toBeNull();
  expect(quoteShipping({...base,zones:[{...zone,ready:false}]}).total).toBeNull();
  expect(quoteShipping({...base,zones:[{...zone,cost:null}]}).total).toBeNull();
 });
 it("respeta zonas activas fuera de la lista sólo cuando tienen tarifa; retiro cuesta cero",()=>{
  const outside=activeZone("Quilmes Oeste",6700,false);
  expect(quoteShipping({...base,locality:"Quilmes Oeste",zones:[outside]})).toEqual({kind:"priced",covered:true,shippingCost:6700,total:28600});
  expect(quoteShipping({...base,method:"pickup",locality:""})).toEqual({kind:"pickup",covered:true,shippingCost:0,total:21900});
 });
 it("Capital Federal y CABA siempre requieren consulta",()=>{
  const caba=activeZone("Capital Federal",4500,true);
  expect(quoteShipping({...base,locality:"Capital Federal",subtotal:90000,zones:[caba]})).toEqual({kind:"pending",covered:false,shippingCost:null,total:null});
  expect(quoteShipping({...base,locality:"CABA",subtotal:90000,zones:[]})).toEqual({kind:"pending",covered:false,shippingCost:null,total:null});
 });
 it("respeta que un admin desactive el envío gratuito para una zona tarifada",()=>{
  const zone=activeZone("Lanús",4000,false);
  expect(quoteShipping({...base,subtotal:65700,zones:[zone]})).toEqual({kind:"priced",covered:true,shippingCost:4000,total:69700});
 });
});
