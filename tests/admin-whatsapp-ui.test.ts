import {describe,expect,it} from "vitest";
import type {WhatsAppRequest} from "@/lib/types";
import {matchesWhatsAppFilter,searchWhatsAppRequests,whatsappRequestCounts} from "@/lib/admin-whatsapp-ui";

const make=(status:WhatsAppRequest["status"],id:string,created_at:string,extra:Partial<WhatsAppRequest>={}):WhatsAppRequest=>({
 id,customer_name:"José Pérez",locality:"Lanús",address:"Calle 123",notes:"",
 shipping_method:"shipping",items:[{id:"catalog-price-2",name:"Alfajor de frutilla",sku:"VIA-2",price:1000,quantity:1}],
 subtotal:1000,status,payment_status:"pending",stock_confirmed:false,
 shipping_cost:null,total:null,amount_paid:0,created_at,updated_at:created_at,...extra
});
const ids={
 draft:"11111111-2222-4333-8444-555555555551",
 contacted:"11111111-2222-4333-8444-555555555552",
 confirmed:"11111111-2222-4333-8444-555555555553",
 preparing:"11111111-2222-4333-8444-555555555554",
 delivered:"11111111-2222-4333-8444-555555555555"
};
const requests=[
 make("delivered",ids.delivered,"2026-10-22T12:00:00Z",{total:1500,amount_paid:1500,payment_status:"paid"}),
 make("draft",ids.draft,"2026-10-30T12:00:00Z"),
 make("contacted",ids.contacted,"2026-10-29T12:00:00Z"),
 make("confirmed",ids.confirmed,"2026-10-28T12:00:00Z",{stock_confirmed:true,shipping_cost:500,total:1500,amount_paid:500,payment_status:"partial"}),
 make("preparing",ids.preparing,"2026-10-27T12:00:00Z",{stock_confirmed:true,shipping_cost:0,total:1000,amount_paid:1000,payment_status:"paid"})
];

describe("cola administrativa de pedidos WhatsApp",()=>{
 it("distingue mensajes preparados de pedidos reales sin confundirlos con ventas",()=>{
  const counts=whatsappRequestCounts(requests);
  expect(counts).toEqual({all:5,attention:3,payment:1,processing:1,finished:1});
  expect(matchesWhatsAppFilter(requests[1],"attention")).toBe(true);
  expect(matchesWhatsAppFilter(requests[1],"payment")).toBe(false);
 });
 it("identifica pagos pendientes a partir del saldo real confirmado",()=>{
  expect(matchesWhatsAppFilter(requests[3],"payment")).toBe(true);
  expect(matchesWhatsAppFilter(requests[0],"payment")).toBe(false);
  expect(matchesWhatsAppFilter(make("cancelled",ids.delivered,"2026-10-30T00:00:00Z",{total:3000,amount_paid:0}),"payment")).toBe(false);
 });
 it("busca nombres, SKU y referencias ignorando tildes y ordena del más reciente",()=>{
  expect(searchWhatsAppRequests(requests,"JOSE","all")).toHaveLength(5);
  expect(searchWhatsAppRequests(requests,"frutilla","all")).toHaveLength(5);
  expect(searchWhatsAppRequests(requests,"via-2","all")).toHaveLength(5);
  expect(searchWhatsAppRequests(requests,"VIA-111111112222","all")).toHaveLength(5);
  expect(searchWhatsAppRequests(requests,"","all").map(item=>item.status)).toEqual(["draft","contacted","confirmed","preparing","delivered"]);
 });
});
