import {describe,expect,it} from "vitest";
import {quoteShipping} from "@/lib/shipping-quote";
import type {ShippingZone} from "@/lib/types";

const activeZone=(name:string,cost:number,freeShippingEligible=true):ShippingZone=>({
 id:"00000000-0000-4000-8000-000000000023",name,postal_codes:[],cost,
 active:true,ready:true,free_shipping_eligible:freeShippingEligible
});
const base={subtotal:21900,locality:"Lanús",method:"shipping" as const,freeShippingThreshold:60000,zones:[] as ShippingZone[]};
describe("cotización de entrega en carrito y WhatsApp",()=>{
 it("mantiene pendiente únicamente una zona cubierta sin tarifa configurada",()=>{
  expect(quoteShipping(base)).toEqual({kind:"pending",covered:true,shippingCost:null,total:null});
  expect(quoteShipping({...base,locality:"Quilmes Oeste"})).toEqual({kind:"priced",covered:false,shippingCost:60000,total:81900});
  expect(quoteShipping({...base,locality:""}).kind).toBe("unselected");
 });
 it("aplica envío gratis solamente con localidad elegible y compra desde el mínimo",()=>{
  expect(quoteShipping({...base,subtotal:65700})).toEqual({kind:"free",covered:true,shippingCost:0,total:65700});
  expect(quoteShipping({...base,subtotal:65700,locality:"Quilmes Oeste"}).total).toBe(125700);
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
 it("aplica tarifa fuera de zona también a CABA, salvo zona configurada explícitamente",()=>{
  const caba=activeZone("Capital Federal",4500,true);
  expect(quoteShipping({...base,locality:"Capital Federal",subtotal:90000,zones:[caba]})).toEqual({kind:"free",covered:true,shippingCost:0,total:90000});
  expect(quoteShipping({...base,locality:"CABA",subtotal:90000,zones:[]})).toEqual({kind:"priced",covered:false,shippingCost:60000,total:150000});
 });
 it("Rosario: 68.700 en productos más 60.000 de envío suman 128.700",()=>{
  expect(quoteShipping({...base,subtotal:68700,locality:"Rosario"})).toEqual({kind:"priced",covered:false,shippingCost:60000,total:128700});
 });
 it("respeta que un admin desactive el envío gratuito para una zona tarifada",()=>{
  const zone=activeZone("Lanús",4000,false);
  expect(quoteShipping({...base,subtotal:65700,zones:[zone]})).toEqual({kind:"priced",covered:true,shippingCost:4000,total:69700});
 });
});
