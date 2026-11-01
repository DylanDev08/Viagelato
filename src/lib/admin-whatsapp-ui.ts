import type {WhatsAppRequest} from "./types";
import {whatsappRequestReference} from "./whatsapp-request-rules";

export type WhatsAppAdminFilter="attention"|"processing"|"payment"|"finished"|"all";

const finished=new Set<WhatsAppRequest["status"]>(["delivered","cancelled"]);
function paymentPreference(request:WhatsAppRequest){
 // Los datos anteriores no tienen payment_preference: sus cobros fueron transferencia.
 return request.payment_preference??(request.notes.startsWith("Forma de pago preferida: Efectivo al recibir")?"cash_on_delivery":"transfer");
}
export function needsWhatsAppAttention(request:WhatsAppRequest):boolean{
 if(request.status==="draft"||request.status==="contacted")return true;
 if(request.status==="confirmed"){
  if(!request.stock_confirmed||request.shipping_cost===null)return true;
  // Efectivo al recibir se puede preparar sin transferencia previa.
  return paymentPreference(request)!=="cash_on_delivery"&&
   (request.payment_status!=="paid"||Number(request.amount_paid)!==Number(request.total));
 }
 // En destino, el cobro contra entrega requiere una acción antes de finalizar.
 return request.status==="shipped"&&paymentPreference(request)==="cash_on_delivery"&&
  (request.payment_status!=="paid"||Number(request.amount_paid)!==Number(request.total));
}
export function hasOutstandingWhatsAppBalance(request:WhatsAppRequest):boolean{
 if(finished.has(request.status)||request.status==="draft")return false;
 const total=request.total===null?null:Number(request.total);
 return total!==null&&Number.isFinite(total)&&total>Number(request.amount_paid);
}
export function matchesWhatsAppFilter(request:WhatsAppRequest,filter:WhatsAppAdminFilter):boolean{
 if(filter==="all")return true;
 if(filter==="attention")return needsWhatsAppAttention(request);
 if(filter==="payment")return hasOutstandingWhatsAppBalance(request);
 if(filter==="finished")return finished.has(request.status);
 return !needsWhatsAppAttention(request)&&["confirmed","preparing","shipped"].includes(request.status);
}
function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim();}
export function searchWhatsAppRequests(requests:WhatsAppRequest[],query:string,filter:WhatsAppAdminFilter){
 const q=normalize(query);
 return requests.filter(request=>{
  if(!matchesWhatsAppFilter(request,filter))return false;
  if(!q)return true;
  const words=[request.customer_name,request.locality,request.address,whatsappRequestReference(request.id),
   ...request.items.flatMap(item=>[item.name,item.sku??""])];
  return normalize(words.join(" ")).includes(q);
 }).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
}
export function whatsappRequestCounts(requests:WhatsAppRequest[]){
 return {all:requests.length,attention:requests.filter(needsWhatsAppAttention).length,
  processing:requests.filter(r=>matchesWhatsAppFilter(r,"processing")).length,
  payment:requests.filter(hasOutstandingWhatsAppBalance).length,
  finished:requests.filter(r=>matchesWhatsAppFilter(r,"finished")).length};
}
