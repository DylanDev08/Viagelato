import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {OUT_OF_ZONE_DELIVERY_COST,quoteShipping} from "@/lib/shipping-quote";

describe("condiciones comerciales en la página de envíos",()=>{
 it("usa la misma tarifa exterior del carrito y no anuncia precios a consultar",()=>{
  const page=readFileSync("src/app/envios/page.tsx","utf8");
  expect(page).toContain("ars(OUT_OF_ZONE_DELIVERY_COST)");
  expect(page).not.toContain("precio siempre a consultar");
  expect(page).toContain("Retiro gratuito en el local");
  expect(page).toContain("settings.pickup_enabled");
  expect(OUT_OF_ZONE_DELIVERY_COST).toBe(60000);
  const quote=quoteShipping({
   subtotal:68700,locality:"Rosario",method:"shipping",
   freeShippingThreshold:60000,zones:[]
  });
  expect(quote.total).toBe(128700);
 });
});
