"use client";
import {useMemo,useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ars,type WhatsAppRequest} from "@/lib/types";
import {whatsappRequestReference} from "@/lib/whatsapp-request-rules";

const labels:Record<WhatsAppRequest["status"],string>={
 draft:"WhatsApp preparado",contacted:"Contactado",confirmed:"Confirmado",
 preparing:"En preparación",shipped:"En camino",delivered:"Entregado",cancelled:"Cancelado"
};
function nextAction(request:WhatsAppRequest){
 if(request.status==="draft")return {action:"contacted",label:"Confirmar que hubo contacto"};
 if(request.status==="contacted")return {action:"confirmed",label:"Confirmar pedido"};
 if(request.status==="confirmed")return {action:"preparing",label:"Preparar"};
 if(request.status==="preparing")return request.shipping_method==="shipping"?{action:"shipped",label:"Marcar en camino"}:{action:"delivered",label:"Marcar entregado"};
 if(request.status==="shipped")return {action:"delivered",label:"Marcar entregado"};
 return null;
}
function money(value:string){return /^\d+(?:\.\d{1,2})?$/.test(value.trim())?Number(value):NaN;}
type Operation={id:string;action:string;[key:string]:string|number|boolean};
function RequestCard({request,freeShippingThreshold}:{request:WhatsAppRequest;freeShippingThreshold:number}){
 const router=useRouter();
 const freeShipping=request.shipping_method==="shipping"&&
  ["Lomas de Zamora","Lanús","Banfield","Avellaneda","Valentín Alsina","Don Bosco","Wilde"].includes(request.locality)&&
  Number(request.subtotal)>=freeShippingThreshold;
 const [shipping,setShipping]=useState(request.shipping_method==="pickup"||freeShipping?"0":request.shipping_cost===null?"":String(Number(request.shipping_cost)));
 const [stock,setStock]=useState(request.stock_confirmed);
 const [paymentAmount,setPaymentAmount]=useState("");
 const [bankReference,setBankReference]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const lastPayment=useRef<{fingerprint:string;key:string}|null>(null);
 const next=nextAction(request);
 const finalTotal=request.total===null?null:Number(request.total);
 const received=Number(request.amount_paid);
 const remaining=finalTotal===null?null:Math.max(0,Math.round((finalTotal-received)*100)/100);
 const termsComplete=request.stock_confirmed&&request.shipping_cost!==null;
 const canEditTerms=(request.status==="contacted"||request.status==="confirmed")&&received===0;
 const canRegisterPayment=["confirmed","preparing","shipped","delivered"].includes(request.status)&&termsComplete&&remaining!==null&&remaining>0;
 const blockedConfirm=request.status==="contacted"&&!termsComplete;
 const blockedPreparing=request.status==="confirmed"&&(request.payment_status!=="paid"||remaining!==0);
 async function apply(data:Operation,success:string){
  if(busy)return false;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/admin/whatsapp-requests",{
    method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
   });
   const payload=await response.json().catch(()=>({error:"Respuesta inválida del servidor"}));
   if(!response.ok)throw new Error(payload.error||"No pudimos guardar los cambios");
   setNotice(success);router.refresh();return true;
  }catch(reason){
   setError(reason instanceof Error?reason.message:"No se pudo guardar el cambio");return false;
  }finally{setBusy(false);}
 }
 async function saveTerms(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const cost=freeShipping?0:money(shipping);
  if(!stock){setError("Marcá disponibilidad comprobada antes de continuar.");return;}
  if(!Number.isFinite(cost)||cost<0||cost>10000000){setError("Ingresá un costo válido de envío. Usá 0 únicamente si fue acordado sin cargo.");return;}
  if(request.shipping_method==="pickup"&&cost!==0){setError("Para retiro, el costo de envío debe ser 0.");return;}
  if(!window.confirm(`¿Confirmás que verificaste stock y acordaste un costo de envío de ${ars(cost)}?`))return;
  await apply({id:request.id,action:"confirm_terms",stock_confirmed:true,shipping_cost:cost},"Stock y costo de envío verificados");
 }
 async function registerPayment(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const amount=money(paymentAmount);
  if(!Number.isFinite(amount)||amount<=0||remaining===null||amount>remaining){setError("El importe debe ser mayor que cero y no superar el saldo pendiente.");return;}
  const normalizedReference=bankReference.trim();
  if(normalizedReference.length>100){setError("La referencia bancaria no puede superar 100 caracteres.");return;}
  if(!window.confirm(`¿Verificaste en la cuenta de Viagelato el ingreso real de ${ars(amount)}? Esto registrará una transferencia.`))return;
  const fingerprint=`${request.id}|${amount}|${normalizedReference}`;
  if(lastPayment.current?.fingerprint!==fingerprint)lastPayment.current={fingerprint,key:crypto.randomUUID()};
  const successful=await apply({
   id:request.id,action:"record_payment",amount,payment_key:lastPayment.current.key,
   transfer_reference:normalizedReference
  },"Transferencia registrada y auditada");
  if(successful){lastPayment.current=null;setPaymentAmount("");setBankReference("");}
 }
 async function move(action:string){
  if(action==="confirmed"&&!window.confirm("¿El cliente confirmó el pedido y ya verificaste stock y costo final?"))return;
  if(action==="delivered"&&!window.confirm("¿La mercadería ya fue entregada?"))return;
  if(action==="cancel"&&!window.confirm("¿Cancelar esta solicitud? No se descontará ni repondrá stock automáticamente."))return;
  await apply({id:request.id,action}, "Estado actualizado correctamente");
 }
 return <article className="whatsapp-request-card">
  <header className="whatsapp-request-header">
   <div><strong>{whatsappRequestReference(request.id)}</strong><small>{new Date(request.created_at).toLocaleString("es-AR")} · {request.customer_name} · {request.locality}</small></div>
   <span className="status-pill">{labels[request.status]}</span>
  </header>
  <div className="whatsapp-request-details">
   <div>{request.items.map((item,index)=><small key={index}>{item.quantity} × {item.name} · {item.sku||"Sin SKU"} · {ars(item.price*item.quantity)}</small>)}</div>
   <div>{request.address?<small>Dirección: {request.address}</small>:null}{request.notes?<small>Observaciones: {request.notes}</small>:null}</div>
  </div>
  <div className="whatsapp-finance-summary">
   <div><small>Productos</small><strong>{ars(Number(request.subtotal))}</strong></div>
   <div><small>Envío confirmado</small><strong>{request.shipping_cost===null?"Pendiente":ars(Number(request.shipping_cost))}</strong></div>
   <div><small>Total final</small><strong>{finalTotal===null?"Pendiente":ars(finalTotal)}</strong></div>
   <div><small>Transferencias acreditadas</small><strong>{ars(received)}</strong></div>
   <div><small>Saldo pendiente</small><strong>{remaining===null?"Por definir":ars(remaining)}</strong></div>
  </div>
  {canEditTerms?<form className="whatsapp-request-form" onSubmit={event=>void saveTerms(event)}>
   <h3>1. Confirmar disponibilidad y envío</h3>
   <label className="inline-check"><input type="checkbox" checked={stock} onChange={event=>setStock(event.target.checked)} disabled={busy}/> Verifiqué que hay stock disponible para este pedido.</label>
   <label>Costo de envío acordado (ARS)
    <input type="number" inputMode="decimal" min="0" max="10000000" step="0.01" value={shipping}
     onChange={event=>setShipping(event.target.value)} disabled={busy||freeShipping} required/>
    <small>{freeShipping?`Envío gratuito por superar ${ars(freeShippingThreshold)} en zona elegible. Se aplica $0 sin cargos adicionales.`:"Ingresá 0 solo si confirmaste que el envío es sin cargo. Para retiro, siempre 0."}</small>
   </label>
   <button type="submit" className="btn tiny" disabled={busy||!stock||!shipping.trim()}>Guardar stock y envío</button>
  </form>:null}
  {termsComplete?<p className="hint">Stock y envío verificados manualmente. Este paso no modifica el inventario.</p>:null}
  {request.payment_status==="partial"?<p className="hint">Pago parcial registrado. El pedido no pasará a preparación hasta completar el saldo.</p>:null}
  {canRegisterPayment?<form className="whatsapp-request-form" onSubmit={event=>void registerPayment(event)}>
   <h3>2. Registrar transferencia acreditada</h3>
   <label>Importe recibido (ARS)<input required type="number" inputMode="decimal" min="0.01" step="0.01"
    max={remaining??undefined} placeholder={remaining===null?"":String(remaining)}
    value={paymentAmount} onChange={event=>setPaymentAmount(event.target.value)} disabled={busy}/></label>
   <label>Referencia bancaria (opcional)<input maxLength={100} value={bankReference}
    onChange={event=>setBankReference(event.target.value)} disabled={busy} placeholder="Número de operación, si está disponible"/></label>
   <button type="submit" className="btn tiny" disabled={busy}>Registrar importe recibido</button>
   <small>Solo anotá dinero efectivamente acreditado. Si es parcial, el saldo se conserva.</small>
  </form>:null}
  {request.whatsapp_request_payments?.length?<details className="whatsapp-payment-history"><summary>Ver transferencias registradas ({request.whatsapp_request_payments.length})</summary>
   {request.whatsapp_request_payments.map(payment=><small key={payment.id}>{ars(Number(payment.amount))} · {new Date(payment.created_at).toLocaleString("es-AR")}{payment.transfer_reference?` · Ref. ${payment.transfer_reference}`:""}</small>)}
  </details>:null}
  <div className="whatsapp-request-actions">
   {next?<button className="btn tiny" type="button" disabled={busy||blockedConfirm||blockedPreparing}
    onClick={()=>void move(next.action)}>{next.label}</button>:null}
   {blockedConfirm?<small>Primero guardá stock y costo de envío.</small>:null}
   {blockedPreparing?<small>Solo podés preparar cuando esté acreditado el total.</small>:null}
   {request.payment_status==="pending"&& !["cancelled","delivered"].includes(request.status)?
    <button type="button" className="btn tiny danger" disabled={busy} onClick={()=>void move("cancel")}>Cancelar</button>:null}
  </div>
  {error?<p role="alert" className="notification notification-error">{error}</p>:null}
  {notice?<p role="status" className="hint">{notice}</p>:null}
 </article>;
}
export function WhatsAppRequests({requests,freeShippingThreshold=60000}:{requests:WhatsAppRequest[];freeShippingThreshold?:number}){
 const [status,setStatus]=useState("all");
 const [search,setSearch]=useState("");
 const visible=useMemo(()=>requests.filter(request=>{
  const found=(request.customer_name+" "+request.locality+" "+whatsappRequestReference(request.id))
   .toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"));
  return found&&(status==="all"||request.status===status);
 }),[requests,search,status]);
 return <section className="panel">
  <h2>Solicitudes de WhatsApp</h2>
  <p className="hint">«WhatsApp preparado» no significa que el cliente haya enviado el mensaje. Confirmá el contacto, verificá existencias y acordá el costo de envío antes de pedir una transferencia. Para preparar el pedido, el pago debe estar acreditado en su totalidad.</p>
  <div className="admin-product-filters">
   <label>Buscar referencia o cliente<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Referencia, nombre o localidad"/></label>
   <label>Estado<select value={status} onChange={event=>setStatus(event.target.value)}>
    <option value="all">Todos</option>{Object.entries(labels).map(([key,value])=><option key={key} value={key}>{value}</option>)}
   </select></label>
  </div>
  <p className="hint" aria-live="polite">{visible.length} de {requests.length} solicitudes recientes</p>
  <div className="whatsapp-request-list">{visible.map(request=><RequestCard key={request.id} request={request} freeShippingThreshold={freeShippingThreshold}/>)}</div>
  {!visible.length?<p className="hint">Todavía no hay solicitudes con ese filtro. Las nuevas aparecerán cuando un cliente prepare el mensaje hacia WhatsApp.</p>:null}
 </section>;
}
