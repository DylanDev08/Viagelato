import {DELIVERY_AREAS,type ShippingZone} from "./types";

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
 // El acuerdo comercial indica que Capital Federal siempre se cotiza por WhatsApp.
 if(target==="capital federal"||target==="caba")return {kind:"pending",covered:false,shippingCost:null,total:null};
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
 return {kind:"pending",covered,shippingCost:null,total:null};
}
