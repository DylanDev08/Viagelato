import {describe,expect,it} from "vitest";
import {quoteShipping,matchesPreparedShippingQuote} from "@/lib/shipping-quote";
import {resolveWhatsAppRequestFinance} from "@/lib/whatsapp-request-finance";

const input={subtotal:68700,locality:"Rosario",method:"shipping" as const,freeShippingThreshold:60000,zones:[]};
const estimated=quoteShipping(input);
const request={
 subtotal:68700,shipping_cost:null,total:null,amount_paid:0,stock_confirmed:false
};

describe("consistencia entre carrito, API y panel de WhatsApp",()=>{
 it("muestra 68.700 + 60.000 = 128.700 fuera de zonas",()=>{
  expect(estimated).toMatchObject({kind:"priced",covered:false,shippingCost:60000,total:128700});
  const finance=resolveWhatsAppRequestFinance(request,estimated);
  expect(finance).toMatchObject({
   displayedShippingCost:60000,displayedTotal:128700,
   remaining:null,termsComplete:false,amountsConfirmed:false
  });
 });
 it("compara tipo, importe de envío y total recibido del servidor",()=>{
  const server={shipping_kind:"priced",shipping_cost:60000,total:128700};
  expect(matchesPreparedShippingQuote(server,estimated)).toBe(true);
  for(const changed of [
   {...server,shipping_kind:"free"},
   {...server,shipping_cost:0},
   {...server,total:68700},
   {...server,total:null},
   {...server,total:"128700"},
   {shipping_kind:"priced",shipping_cost:60000}
  ])expect(matchesPreparedShippingQuote(changed,estimated)).toBe(false);
 });
 it("conserva pendiente el envío bajo el mínimo en zona sin tarifa",()=>{
  const quote=quoteShipping({...input,subtotal:21900,locality:"Lanús"});
  expect(quote).toMatchObject({kind:"pending",shippingCost:null,total:null});
  expect(matchesPreparedShippingQuote({shipping_kind:"pending",shipping_cost:null,total:null},quote)).toBe(true);
 });
 it("no permite cobros hasta que stock y total estén confirmados",()=>{
  const withConfirmedShipping={...request,shipping_cost:60000,total:128700,stock_confirmed:false};
  expect(resolveWhatsAppRequestFinance(withConfirmedShipping,estimated).remaining).toBeNull();
  expect(resolveWhatsAppRequestFinance({...withConfirmedShipping,stock_confirmed:true},estimated)).toMatchObject({
   termsComplete:true,remaining:128700,amountsConfirmed:true
  });
  expect(resolveWhatsAppRequestFinance({...withConfirmedShipping,stock_confirmed:true,amount_paid:50000},estimated).remaining).toBe(78700);
 });
 it("detecta importes desactualizados o pagos superiores al total",()=>{
  const invalid=[
   {...request,shipping_cost:60000,total:null},
   {...request,shipping_cost:null,total:128700},
   {...request,shipping_cost:null,total:null,amount_paid:500},
   {...request,shipping_cost:60000,total:68700},
   {...request,shipping_cost:60000,total:128700,amount_paid:128701},
   {...request,shipping_cost:-1,total:68699},
  ];
  invalid.forEach(entry=>{
   const result=resolveWhatsAppRequestFinance({...entry,stock_confirmed:true},estimated);
   expect(result.inconsistent).toBe(true);
   expect(result.remaining).toBeNull();
   expect(result.displayedTotal).toBeNull();
  });
 });
 it("respeta tarifa histórica confirmada aun si cambiaron zonas comerciales",()=>{
  const old={...request,shipping_cost:8000,total:76700,amount_paid:7000,stock_confirmed:true};
  expect(resolveWhatsAppRequestFinance(old,estimated)).toMatchObject({
   amountsConfirmed:true,displayedShippingCost:8000,displayedTotal:76700,remaining:69700,inconsistent:false
  });
 });
 it("zona elegible tiene envío gratis desde 60.000 y retiro no suma envío",()=>{
  const free=quoteShipping({...input,locality:"Lanús"});
  const pickup=quoteShipping({...input,method:"pickup",locality:""});
  expect(free).toMatchObject({kind:"free",shippingCost:0,total:68700});
  expect(pickup).toMatchObject({kind:"pickup",shippingCost:0,total:68700});
 });
});
