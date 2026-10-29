import {describe,it,expect} from "vitest";
import {normalizeWhatsAppRequest,whatsappRequestReference,whatsappRequestSchema} from "@/lib/whatsapp-request-rules";
const one={customer_name:"Ana Gomez",locality:"Lanús",address:"",notes:"",shipping_method:"shipping" as const,
 items:[{id:"catalog-price-4",quantity:1},{id:"catalog-price-2",quantity:3}]};
describe("solicitudes comerciales WhatsApp",()=>{
 it("valida artículos y normaliza el orden para idempotencia",()=>{
  const input=whatsappRequestSchema.parse(one);
  expect(normalizeWhatsAppRequest(input).items.map(p=>p.id)).toEqual(["catalog-price-2","catalog-price-4"]);
 });
 it("impide duplicados y cantidades que no caben en el carrito",()=>{
  expect(whatsappRequestSchema.safeParse({...one,items:[one.items[0],one.items[0]]}).success).toBe(false);
  expect(whatsappRequestSchema.safeParse({...one,items:[{id:"catalog-price-2",quantity:100}]}).success).toBe(false);
  expect(whatsappRequestSchema.safeParse({...one,items:Array.from({length:31},(_,i)=>({id:`catalog-price-${i+2}`,quantity:1}))}).success).toBe(false);
 });
 it("no acepta ids arbitrarios ni ausencia de cliente",()=>{
  expect(whatsappRequestSchema.safeParse({...one,customer_name:""}).success).toBe(false);
  expect(whatsappRequestSchema.safeParse({...one,items:[{id:"cualquier-cosa",quantity:1}]}).success).toBe(false);
 });
 it("crea referencias compactas sin exponer datos personales",()=>{
  expect(whatsappRequestReference("11111111-2222-4333-8444-555555555555")).toBe("VIA-111111112222");
 });
});
