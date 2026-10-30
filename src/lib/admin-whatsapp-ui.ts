import type {WhatsAppRequest} from "./types";
import {whatsappRequestReference} from "./whatsapp-request-rules";

export type WhatsAppAdminFilter="attention"|"processing"|"finished"|"payment"|"all";

export function needsWhatsAppAttention(request:WhatsAppRequest):boolean{
 if(request.status==="draft"||request.status==="contacted")return true;
 return request.status==="confirmed"&&(
  !request.stock_confirmed||request.shipping_cost===null||request.payment_status!=="paid"
 );
}
export function isWhatsAppPaymentPending(request:WhatsAppRequest):boolean{
 return !["draft","cancelled"].includes(request.status)&&
  request.total!==null&&Number(request.total)>Number(request.amount_paid);
}
export function matchesWhatsAppFilter(request:WhatsAppRequest,filter:WhatsAppAdminFilter):boolean{
 if(filter==="all")return true;
 if(filter==="attention")return needsWhatsAppAttention(request);
 if(filter==="payment")return isWhatsAppPaymentPending(request);
 if(filter==="finished")return request.status==="delivered"||request.status==="cancelled";
 return !needsWhatsAppAttention(request)&&["confirmed","preparing","shipped"].includes(request.status);
}
function normalized(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim();}
export function searchWhatsAppRequests(requests:WhatsAppRequest[],query:string,filter:WhatsAppAdminFilter):WhatsAppRequest[]{
 const q=normalized(query);
 return requests.filter(request=>{
  if(!matchesWhatsAppFilter(request,filter))return false;
  if(!q)return true;
  const haystack=[request.customer_name,request.locality,request.address,whatsappRequestReference(request.id),
   ...request.items.flatMap(item=>[item.name,item.sku??""])
  ].join(" ");
  return normalized(haystack).includes(q);
 }).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
}
export function whatsappRequestCounts(requests:WhatsAppRequest[]){
 return {
  all:requests.length,
  attention:requests.filter(needsWhatsAppAttention).length,
  payment:requests.filter(isWhatsAppPaymentPending).length,
  processing:requests.filter(request=>matchesWhatsAppFilter(request,"processing")).length,
  finished:requests.filter(request=>matchesWhatsAppFilter(request,"finished")).length
 };
}
