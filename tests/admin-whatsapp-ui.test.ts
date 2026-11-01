import {describe,it,expect} from "vitest";
import type {WhatsAppRequest} from "@/lib/types";
import {searchWhatsAppRequests,whatsappRequestCounts,matchesWhatsAppFilter} from "@/lib/admin-whatsapp-ui";
const id=(i:number)=>`11111111-2222-4333-8444-${String(i).padStart(12,"0")}`;
function request(status:WhatsAppRequest["status"],i:number,extra:Partial<WhatsAppRequest>={}):WhatsAppRequest{
 return {id:id(i),customer_name:"José Pérez",locality:"Lanús",address:"Calle 123",notes:"",
  payment_preference:"transfer",shipping_method:"shipping",
  items:[{id:"catalog-price-2",name:"Palitos de limón",sku:"VIA-2",price:1000,quantity:1}],
  subtotal:1000,status,payment_status:"pending",stock_confirmed:false,
  shipping_cost:null,total:null,amount_paid:0,created_at:`2026-10-${String(i).padStart(2,"0")}T12:00:00Z`,
  updated_at:"2026-10-30T12:00:00Z",...extra};
}
describe("clasificación operativa de pedidos WhatsApp",()=>{
 const drafts=request("draft",1);
 const contacted=request("contacted",2);
 const transferWaiting=request("confirmed",3,{total:1200,stock_confirmed:true,shipping_cost:200});
 const codReady=request("confirmed",4,{payment_preference:"cash_on_delivery",total:1200,stock_confirmed:true,shipping_cost:200});
 const codOutForDelivery=request("shipped",5,{payment_preference:"cash_on_delivery",total:1200,stock_confirmed:true,shipping_cost:200});
 const paidPreparing=request("preparing",6,{total:1000,stock_confirmed:true,shipping_cost:0,amount_paid:1000,payment_status:"paid"});
 const delivered=request("delivered",7,{total:1200,amount_paid:1200,payment_status:"paid"});
 const cancelled=request("cancelled",8,{total:1200,amount_paid:0});
 const all=[cancelled,paidPreparing,delivered,contacted,codOutForDelivery,transferWaiting,codReady,drafts];

 it("no exige transferencia anticipada para preparar efectivo al recibir",()=>{
  expect(matchesWhatsAppFilter(codReady,"attention")).toBe(false);
  expect(matchesWhatsAppFilter(codReady,"processing")).toBe(true);
  expect(matchesWhatsAppFilter(transferWaiting,"attention")).toBe(true);
  expect(matchesWhatsAppFilter(codOutForDelivery,"attention")).toBe(true);
  expect(matchesWhatsAppFilter(codOutForDelivery,"payment")).toBe(true);
 });
 it("prioriza contacto y cobros sin atribuir ventas a mensajes preparados",()=>{
  expect(whatsappRequestCounts(all)).toEqual({all:8,attention:4,processing:2,payment:3,finished:2});
  expect(matchesWhatsAppFilter(drafts,"payment")).toBe(false);
  expect(matchesWhatsAppFilter(cancelled,"payment")).toBe(false);
  expect(matchesWhatsAppFilter(delivered,"payment")).toBe(false);
 });
 it("busca nombres, localidades, SKU y referencias sin acentos; ordena por fecha",()=>{
  expect(searchWhatsAppRequests(all,"JOSE","all")).toHaveLength(8);
  expect(searchWhatsAppRequests(all,"limon","all")).toHaveLength(8);
  expect(searchWhatsAppRequests(all,"VIA-2","all")).toHaveLength(8);
  expect(searchWhatsAppRequests(all,"Calle 123","all")).toHaveLength(8);
  expect(searchWhatsAppRequests(all,"VIA-111111112222","all")).toHaveLength(8);
  expect(searchWhatsAppRequests(all,"","all")[0].id).toBe(cancelled.id);
  expect(searchWhatsAppRequests(all,"faltante","all")).toHaveLength(0);
 });
});
