import {DELIVERY_AREAS,type Product,type ShippingZone} from "./types";

/** Estado comercial del panel, sin activar productos ni inventar tarifas. */
export function commercialReadiness(products:Product[],zones:ShippingZone[]){
 const visible=products.filter(product=>product.catalog_visible===true);
 const published=products.filter(product=>product.active===true&&product.commercially_verified===true);
 const normalize=(value:string)=>value.trim().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").replace(/\s+/g," ");
 const pricedAreas=DELIVERY_AREAS.filter(area=>zones.some(zone=>
  normalize(zone.name)===normalize(area)&&zone.active===true&&zone.ready===true&&
  zone.cost!==null&&Number.isFinite(Number(zone.cost))&&Number(zone.cost)>=0
 )).length;
 return {
  visibleForInquiry:visible.length,
  awaitingVerification:visible.filter(product=>!product.commercially_verified).length,
  withoutConfirmedStock:visible.filter(product=>!Number.isFinite(Number(product.stock))||Number(product.stock)<=0).length,
  published:published.length,
  areasWithConfirmedTariff:pricedAreas,
  commercialAreas:DELIVERY_AREAS.length,
 };
}
