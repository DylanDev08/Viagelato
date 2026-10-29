import {ars,type Product} from "./types";

export type InquiryLine=Pick<Product,"name"|"sku"|"presentation"|"price">&{quantity:number};

/**
 * Una consulta no es una compra: no cotiza envío ni promete stock.
 * El backend sigue siendo la única fuente de verdad para pedidos reales.
 */
export function cartInquiryMessage(lines:InquiryLine[],locality:string,subtotal:number){
 const area=locality.trim()||"A confirmar";
 const details=lines.map(item=>{
  const presentation=item.presentation?.trim()? ` (${item.presentation.trim()})`:"";
  const sku=item.sku?.trim()? ` [${item.sku.trim()}]`:"";
  return `• ${item.name}${presentation}${sku} × ${item.quantity} — ${ars(Number(item.price)*item.quantity)}`;
 }).join("\n");
 return [
  "Hola, quiero consultar disponibilidad y entrega en Viagelato.",
  `Localidad: ${area}.`,
  ...(details?["Productos:",details]:[]),
  ...(details?[`Subtotal orientativo sin envío: ${ars(subtotal)}.`]:[]),
  "¿Me confirman stock, costo de envío y día de entrega?",
  "Esto es una consulta, no un pedido confirmado."
 ].join("\n");
}
