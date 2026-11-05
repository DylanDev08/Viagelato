import {DELIVERY_AREAS,type ShippingZone} from "./types";

/** Localidad fija del punto de retiro; no requiere ingresar zona de entrega. */
export const PICKUP_LOCALITY="Lanús Este";

/** Cotización orientativa de entrega. Nunca se interpreta como un pago ni una reserva. */
export type ShippingQuote={
 kind:"unselected"|"pickup"|"free"|"priced"|"pending";
 covered:boolean;
 shippingCost:number|null;
 total:number|null;
};

function normalized(value:string){
 return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").replace(/\s+/g," ");
}
function currencyAmount(value:number){
 return Number.isFinite(value)?Math.round(value*100)/100:0;
}

/** Misma lógica en cliente y API. El servidor vuelve a consultar tarifas antes de generar WhatsApp. */
export function quoteShipping(input:{
 subtotal:number;locality:string;method:"shipping"|"pickup";
 freeShippingThreshold:number;zones:ShippingZone[];
}):ShippingQuote{
 const {subtotal,locality,method,freeShippingThreshold,zones}=input;
 if(method==="pickup")return {kind:"pickup",covered:true,shippingCost:0,total:currencyAmount(subtotal)};
 if(!locality.trim())return {kind:"unselected",covered:false,shippingCost:null,total:null};
 const target=normalized(locality);
 const configured=zones.find(zone=>
  zone.active===true&&zone.ready===true&&zone.cost!==null&&
  Number.isFinite(Number(zone.cost))&&Number(zone.cost)>=0&&
  normalized(zone.name)===target
 );
 const covered=DELIVERY_AREAS.some(area=>normalized(area)===target)||Boolean(configured);
 const freeEligible=configured?configured.free_shipping_eligible===true:DELIVERY_AREAS.some(area=>normalized(area)===target);
 const threshold=Number(freeShippingThreshold);
 if(freeEligible&&Number.isFinite(threshold)&&threshold>=0&&subtotal>0&&subtotal>=threshold)
  return {kind:"free",covered:true,shippingCost:0,total:currencyAmount(subtotal)};
 if(configured){
  const shippingCost=currencyAmount(Number(configured.cost));
  return {kind:"priced",covered:true,shippingCost,total:currencyAmount(subtotal+shippingCost)};
 }
 // No hay tarifa comercial confirmada: nunca tratar el mínimo de compra como costo de envío.
 return {kind:"pending",covered,shippingCost:null,total:null};
}

/** Comparación estricta del presupuesto de la API con lo que vio el cliente.
 * Nunca abrir WhatsApp si cambian tipo, envío o total; exige todos los campos.
 * No se compara el subtotal aquí porque el checkout ya valida su valor con el servidor.
 */
export function matchesPreparedShippingQuote(
 received:{shipping_kind?:unknown;shipping_cost?:unknown;total?:unknown},
 expected:ShippingQuote
):boolean{
 const matchesAmount=(actual:unknown,value:number|null)=>
  value===null?actual===null:
   typeof actual==="number"&&Number.isFinite(actual)&&Math.abs(actual-value)<0.01;
 return received.shipping_kind===expected.kind&&
  matchesAmount(received.shipping_cost,expected.shippingCost)&&
  matchesAmount(received.total,expected.total);
}
