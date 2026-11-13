import {describe,expect,it} from "vitest";
import {quoteShipping,freeShippingGoal,matchesPreparedShippingQuote} from "@/lib/shipping-quote";
import {DELIVERY_AREAS,type ShippingZone} from "@/lib/types";

const zone=(name:string,cost:number,eligible=true):ShippingZone=>({
 id:"00000000-0000-4000-8000-000000000023",name,postal_codes:[],cost,
 active:true,ready:true,free_shipping_eligible:eligible
});
const base={subtotal:21900,locality:"Lanús Este",method:"shipping" as const,freeShippingThreshold:60000,zones:[] as ShippingZone[]};
const pending={kind:"pending",covered:true,shippingCost:null,total:null};

describe("envío cotizado por WhatsApp según política Viagelato",()=>{
 it("consulta por WhatsApp todo envío bajo $60.000 incluso con tarifa de zona previamente cargada",()=>{
  for(const subtotal of [21900,40000,59999.99]){
   for(const zones of [[],[zone("Lanús Este",5000)],[zone("Lanús Este",0)],[zone("Lanús Este",1000,false)]]){
    expect(quoteShipping({...base,subtotal,zones})).toEqual(pending);
   }
  }
 });
 it("a partir de $60.000 inclusive, todas las 15 localidades reciben envío gratis sin tarifa ni excepción histórica",()=>{
  expect(DELIVERY_AREAS).toHaveLength(15);
  for(const locality of DELIVERY_AREAS){
   for(const zones of [[],[zone(locality,4500,false)],[zone(locality,4500)]]){
    expect(quoteShipping({...base,subtotal:60000,locality,zones}))
     .toEqual({kind:"free",covered:true,shippingCost:0,total:60000});
    expect(quoteShipping({...base,subtotal:120000,locality,zones}).shippingCost).toBe(0);
   }
  }
 });
 it("localidades fuera de cobertura siempre deben consultar por WhatsApp",()=>{
  for(const subtotal of [10000,60000,100000]){
   expect(quoteShipping({...base,subtotal,locality:"Quilmes Oeste",zones:[zone("Quilmes Oeste",6500)]}))
    .toEqual({kind:"pending",covered:false,shippingCost:null,total:null});
  }
  expect(quoteShipping({...base,subtotal:90000,locality:"Rosario"}).kind).toBe("pending");
 });
 it("las variantes Lanús/CABA heredadas conservan los mismos mínimos",()=>{
  for(const locality of ["Lanús","LANUS","CABA","Capital Federal"]){
   expect(quoteShipping({...base,subtotal:60000,locality}).kind).toBe("free");
   expect(quoteShipping({...base,subtotal:59999.99,locality}).kind).toBe("pending");
  }
 });
 it("retiro no suma flete ni exige mínimo, y falta de zona no inventa cotización",()=>{
  expect(quoteShipping({...base,method:"pickup",locality:""}))
   .toEqual({kind:"pickup",covered:true,shippingCost:0,total:21900});
  expect(quoteShipping({...base,locality:""}))
   .toEqual({kind:"unselected",covered:false,shippingCost:null,total:null});
 });
 it("el progreso hacia gratuidad no confunde un flete manual con un precio",()=>{
  const goal=freeShippingGoal({...base,zones:[zone("Lanús Este",5000)]});
  expect(goal.kind).toBe("remaining");
  expect(goal.remaining).toBe(38100);
  expect(freeShippingGoal({...base,locality:"Quilmes Oeste",subtotal:66000}).kind).toBe("ineligible");
 });
 it("la API debe devolver null en costo y total hasta confirmar vía WhatsApp",()=>{
  expect(matchesPreparedShippingQuote({shipping_kind:"pending",shipping_cost:null,total:null},quoteShipping(base))).toBe(true);
  expect(matchesPreparedShippingQuote({shipping_kind:"priced",shipping_cost:5000,total:26900},quoteShipping(base))).toBe(false);
 });
});
