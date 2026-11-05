import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {quoteShipping} from "@/lib/shipping-quote";

describe("condiciones comerciales en la página de envíos",()=>{
 it("informa mínimo de 60.000 para gratuidad y no inventa tarifa externa",()=>{
  const page=readFileSync("src/app/envios/page.tsx","utf8");
  expect(page).toContain("Envío sin cargo desde");
  expect(page).toContain("No se suma una tarifa fija");
  expect(page).not.toContain("OUT_OF_ZONE_DELIVERY_COST");
  expect(page).toContain("Retiro gratuito en el local");
  expect(page).toContain("settings.pickup_enabled");
  expect(quoteShipping({
   subtotal:68700,locality:"Rosario",method:"shipping",
   freeShippingThreshold:60000,zones:[]
  })).toEqual({kind:"pending",covered:false,shippingCost:null,total:null});
 });
});
