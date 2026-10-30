import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const checkout=readFileSync("src/components/checkout.tsx","utf8");

describe("checkout: entrega contextual",()=>{
 it("la zona es opcional y solo aparece para envíos",()=>{
  expect(checkout).toContain('delivery==="shipping"?<label>Zona de entrega (opcional)');
  expect(checkout).toContain('<option value="">Seleccionar zona (opcional)</option>');
  expect(checkout).not.toContain('<label>Localidad<select required');
 });
 it("el retiro no pide dirección ni localidad",()=>{
  expect(checkout).toContain('delivery==="pickup"?"Retiro en local"');
  expect(checkout).toContain('delivery==="shipping"?<label>Dirección de entrega<input required');
  expect(checkout).toContain('delivery==="pickup"?<div className="whatsapp-payment-info"');
 });
 it("expone elección de pago y confirma el pedido desde el carrito",()=>{
  expect(checkout).toContain('Método de pago<select');
  expect(checkout).toContain('Enviar pedido por WhatsApp');
  expect(checkout).toContain('payment_method:paymentMethod');
 });
});
