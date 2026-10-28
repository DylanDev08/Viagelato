import {describe,expect,it} from "vitest";
import {cartInquiryMessage} from "@/lib/cart-inquiry";
import {whatsappHref} from "@/lib/whatsapp";

describe("consulta del carrito por WhatsApp (sin registrar pedidos)",()=>{
 const item={name:"Palitos de agua",sku:"VIA-PAL-002-X36",presentation:"Caja de 36 unidades",price:21900,quantity:2};
 it("indica unidad de venta, cantidades, subtotal y zona sin inventar tarifas",()=>{
  const text=cartInquiryMessage([item],"Lanús",43800);
  expect(text).toContain("Lanús");
  expect(text).toContain("Caja de 36 unidades");
  expect(text).toContain("VIA-PAL-002-X36");
  expect(text).toContain("43.800");
  expect(text).toContain("sin envío");
  expect(text).toContain("no un pedido confirmado");
  expect(text).not.toMatch(/envío gratis|entrega garantizada/i);
 });
 it("puede armar una consulta aun sin productos públicos",()=>{
  const text=cartInquiryMessage([],"",0);
  expect(text).toContain("A confirmar");
  expect(text).toContain("confirmar");
  expect(text).not.toContain("Subtotal orientativo");
 });
 it("usa el enlace de WhatsApp validado, codificando el detalle",()=>{
  const msg=cartInquiryMessage([item],"Banfield",43800);
  const url=whatsappHref("+5491140962202",msg);
  expect(url?.startsWith("https://wa.me/5491140962202?text=")).toBe(true);
  expect(decodeURIComponent(url||"")).toContain("VIA-PAL-002-X36");
 });
});
