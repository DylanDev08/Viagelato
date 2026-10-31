import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "./catalog-prices";
import {ars} from "./types";
import {quoteShipping,type ShippingQuote} from "./shipping-quote";

export const catalogCartId=(row:number)=>`catalog-price-${row}`;

export const PRICED_CART_PRODUCTS=CATALOG_PRICE_ITEMS.map(item=>({
 id:catalogCartId(item.sourceRow),name:item.name,sku:item.sku,
 presentation:item.presentation,price:item.price,image_url:item.image,stock:null,
})) satisfies Array<{id:string;name:string;sku:string;presentation:string;price:number;image_url:string|null;stock:null}>;

export type WhatsAppCartLine={name:string;sku?:string|null;presentation?:string|null;price:number;quantity:number};
export type WhatsAppCheckoutDetails={
 name:string;locality:string;address:string;notes:string;
 shippingMethod:"shipping"|"pickup";freeShippingThreshold:number;
 shippingQuote?:ShippingQuote;
};

export function whatsappCartMessage(lines:WhatsAppCartLine[],info:WhatsAppCheckoutDetails){
 if(!lines.length)throw new Error("El carrito está vacío");
 const display=(text:string,max:number)=>text.trim().replace(/\s+/g," ").slice(0,max);
 const name=display(info.name,120),locality=display(info.locality,100);
 if(name.length<2||locality.length<2)throw new Error("Completá nombre y localidad");
 const subtotal=lines.reduce((s,item)=>s+Number(item.price)*item.quantity,0);
 if(!Number.isFinite(subtotal)||subtotal<=0||lines.some(item=>!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99||!Number.isFinite(item.price)||item.price<=0))throw new Error("Revisá las cantidades del carrito");
 const items=lines.map((item,i)=>{
  const presentation=item.presentation?.trim()? ` (${display(item.presentation,140)})`:"";
  const sku=item.sku?.trim()? ` [${display(item.sku,100)}]`:"";
  return `${i+1}. ${display(item.name,160)}${presentation}${sku} — ${item.quantity} x ${ars(item.price)} = ${ars(item.price*item.quantity)}`;
 }).join("\n");
 const quote=info.shippingQuote??quoteShipping({
  subtotal,locality,method:info.shippingMethod,freeShippingThreshold:info.freeShippingThreshold,zones:[]
 });
 return [
  "Hola Viagelato, quiero realizar este pedido y coordinar el pago por WhatsApp.",
  `Nombre: ${name}`,
  `Entrega: ${info.shippingMethod==="pickup"?"Retiro (a confirmar)":"Envío a domicilio"}`,
  `Localidad: ${locality}`,
  ...(info.shippingMethod==="shipping"&&display(info.address,250)?[`Dirección: ${display(info.address,250)}`]:[]),
  ...(display(info.notes,350)?[`Observaciones: ${display(info.notes,350)}`]:[]),
  "",
  "Productos (precio por caja o presentación):",
  items,
  "",
  `Subtotal de productos: ${ars(subtotal)}`,
  quote.kind==="free"?"Envío: gratis (zona habilitada y mínimo alcanzado).":
   quote.kind==="pickup"?"Envío: retiro sin cargo.":
   quote.kind==="priced"?`Envío a ${locality}: ${ars(quote.shippingCost??0)} (tarifa vigente).`:
   "Envío: pendiente de cotizar y confirmar cobertura por WhatsApp.",
  quote.total!==null?`Total estimado de productos y envío: ${ars(quote.total)}.`:
   `Total de productos: ${ars(subtotal)}. Total final con envío: a confirmar.`,
  "¿Me confirman stock, fecha de entrega y datos para realizar la transferencia?",
  "Este mensaje solicita el pedido; no implica pago ni confirmación automática."
 ].join("\n");
}

export function catalogSourceId(item:Pick<CatalogPriceItem,"sourceRow">){return catalogCartId(item.sourceRow);}
