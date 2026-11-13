import {describe,expect,it} from "vitest";
import {freeShippingGoal} from "@/lib/shipping-quote";
import type {ShippingZone} from "@/lib/types";
const base={subtotal:21900,locality:"Lanús",method:"shipping" as const,freeShippingThreshold:60000,zones:[] as ShippingZone[]};
const zone=(name:string,eligible:boolean):ShippingZone=>({id:"00000000-0000-4000-8000-000000000055",name,postal_codes:[],cost:4500,active:true,ready:true,free_shipping_eligible:eligible});
describe("guía del mínimo de envío gratis",()=>{
 it("muestra monto restante en una localidad elegible",()=>{
  expect(freeShippingGoal(base)).toEqual({kind:"remaining",remaining:38100,percentage:37,threshold:60000});
  expect(freeShippingGoal({...base,subtotal:60000}).kind).toBe("reached");
  expect(freeShippingGoal({...base,subtotal:59999.99})).toMatchObject({kind:"remaining",percentage:99});
 });
 it("no anuncia el beneficio antes de elegir zona ni para retiro",()=>{
  expect(freeShippingGoal({...base,locality:""}).kind).toBe("choose_zone");
  expect(freeShippingGoal({...base,method:"pickup",locality:""}).kind).toBe("pickup");
 });
 it("garantiza gratuidad desde el mínimo en zonas habilitadas y cotiza fuera por WhatsApp",()=>{
  expect(freeShippingGoal({...base,subtotal:80000,locality:"Capital Federal",zones:[zone("Capital Federal",true)]}).kind).toBe("reached");
  expect(freeShippingGoal({...base,subtotal:80000,locality:"Quilmes Oeste",zones:[zone("Quilmes Oeste",true)]}).kind).toBe("ineligible");
  expect(freeShippingGoal({...base,subtotal:80000,locality:"Lanús",zones:[zone("Lanús",false)]}).kind).toBe("reached");
 });
});
