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
 // Compatibilidad para pedidos anteriores: "Lanús" sigue siendo una localidad válida
 // aunque el nuevo selector distingue Lanús Este y Lanús Oeste.
 const canonicalTarget=target==="caba"?"capital federal":target;
 const configured=zones.find(zone=>
  zone.active===true&&zone.ready===true&&zone.cost!==null&&
  Number.isFinite(Number(zone.cost))&&Number(zone.cost)>=0&&
  normalized(zone.name)===canonicalTarget
 );
 const includedArea=DELIVERY_AREAS.some(area=>normalized(area)===canonicalTarget)||target==="lanus";
 const covered=includedArea||Boolean(configured);
 // Solo las localidades comerciales vigentes (y la referencia histórica "Lanús") pueden obtener envío gratuito.
 // Configurar una tarifa en otra localidad no la convierte en beneficiaria.
 const freeEligible=includedArea&&(!configured||configured.free_shipping_eligible===true);
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

/** Indicador comercial, calculado con la misma regla de cotización que usa la API. */
export function freeShippingGoal(input:Parameters<typeof quoteShipping>[0]){
 const threshold=Number(input.freeShippingThreshold);
 const subtotal=Number.isFinite(input.subtotal)?Math.max(0,input.subtotal):0;
 const basic={threshold:Number.isFinite(threshold)?threshold:0,remaining:0,percentage:0};
 if(input.method==="pickup")return {...basic,kind:"pickup" as const};
 if(!input.locality.trim())return {...basic,kind:"choose_zone" as const};
 if(!Number.isFinite(threshold)||threshold<=0)return {...basic,kind:"ineligible" as const};
 // Consultar el presupuesto al alcanzar el umbral evita duplicar reglas de zonas.
 if(quoteShipping({...input,subtotal:threshold}).kind!=="free")return {...basic,kind:"ineligible" as const};
 if(subtotal>=threshold)return {...basic,kind:"reached" as const,percentage:100};
 return {...basic,kind:"remaining" as const,remaining:Number((threshold-subtotal).toFixed(2)),percentage:Math.min(99,Math.round(subtotal/threshold*100))};
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
