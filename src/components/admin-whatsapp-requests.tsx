"use client";
import {useMemo,useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ars,type WhatsAppRequest} from "@/lib/types";
import {whatsappRequestReference,paymentFromNotes} from "@/lib/whatsapp-request-rules";
import {searchWhatsAppRequests,whatsappRequestCounts,type WhatsAppAdminFilter} from "@/lib/admin-whatsapp-ui";

const labels:Record<WhatsAppRequest["status"],string>={
 draft:"Mensaje preparado",contacted:"Contactado",confirmed:"Pedido confirmado",
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
 const legacyPayment=paymentFromNotes(request.notes);
 const paymentPreference=request.payment_preference??legacyPayment.paymentPreference??"transfer";
 const cashOnDelivery=paymentPreference==="cash_on_delivery";
 const [shipping,setShipping]=useState(request.shipping_method==="pickup"||freeShipping?"0":request.shipping_cost===null?"":String(Number(request.shipping_cost)));
 const [stock,setStock]=useState(request.stock_confirmed);
 const [paymentAmount,setPaymentAmount]=useState("");
 const [bankReference,setBankReference]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const lastPayment=useRef<{fingerprint:string;key:string}|null>(null);
 const lastCashKey=useRef<string|null>(null);
 const next=nextAction(request);
 const finalTotal=request.total===null?null:Number(request.total);
 const received=Number(request.amount_paid);
 const remaining=finalTotal===null?null:Math.max(0,Math.round((finalTotal-received)*100)/100);
 const termsComplete=request.stock_confirmed&&request.shipping_cost!==null;
 const canEditTerms=(request.status==="contacted"||request.status==="confirmed")&&received===0;
 const canRegisterPayment=["confirmed","preparing","shipped","delivered"].includes(request.status)&&termsComplete&&remaining!==null&&remaining>0;
 const blockedConfirm=request.status==="contacted"&&!termsComplete;
 const blockedPreparing=request.status==="confirmed"&&!cashOnDelivery&&(request.payment_status!=="paid"||remaining!==0);
 const blockedDelivered=next?.action==="delivered"&&(request.payment_status!=="paid"||remaining!==0);
 const canRegisterCash=cashOnDelivery&&termsComplete&&remaining!==null&&remaining>0&&
  (request.status==="shipped"||(request.status==="preparing"&&request.shipping_method==="pickup"));
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
 async function registerCash(){
  if(busy||!canRegisterCash||remaining===null)return;
  if(!window.confirm(`¿Recibiste físicamente ${ars(remaining)} en efectivo de este cliente? Este cobro quedará registrado.`))return;
  if(!lastCashKey.current)lastCashKey.current=crypto.randomUUID();
  const success=await apply({id:request.id,action:"record_cash",amount:remaining,payment_key:lastCashKey.current},"Efectivo recibido y registrado");
  if(success)lastCashKey.current=null;
 }
 async function move(action:string){
  if(action==="confirmed"&&!window.confirm("¿El cliente confirmó el pedido y ya verificaste stock y costo final?"))return;
  if(action==="delivered"&&!window.confirm("¿La mercadería ya fue entregada?"))return;
  if(action==="cancel"&&!window.confirm("¿Cancelar esta solicitud? No se descontará ni repondrá stock automáticamente."))return;
  await apply({id:request.id,action}, "Estado actualizado correctamente");
 }
 return <article className="whatsapp-request-card">
  <header className="whatsapp-request-header">
   <div className="whatsapp-request-identity"><strong>{request.customer_name}</strong><small>Solicitud {whatsappRequestReference(request.id)} · {new Date(request.created_at).toLocaleString("es-AR")}</small><small>{request.shipping_method==="pickup"?"Retiro":"Envío"} · {request.locality}</small></div>
   <div className="whatsapp-request-badges"><span className="status-pill">{labels[request.status]}</span><span className="admin-payment-pill">{request.payment_status==="paid"?"Cobrado":request.payment_status==="partial"?"Cobro parcial":cashOnDelivery?"Efectivo al recibir":"Pago pendiente"}</span></div>
  </header>
  {request.status==="draft"?<p className="whatsapp-request-unconfirmed">El cliente preparó el mensaje, pero eso no confirma que lo haya enviado por WhatsApp. Verificá el contacto antes de aceptar el pedido.</p>:null}
  <details className="whatsapp-request-products"><summary>Productos y datos de entrega ({request.items.length} {request.items.length===1?"producto":"productos"})</summary>
   <div className="whatsapp-request-details">
    <div>{request.items.map((item,index)=><small key={index}>{item.quantity} × {item.name} · {item.sku||"Sin SKU"} · {ars(item.price*item.quantity)}</small>)}</div>
    <div>{request.address?<small>Dirección: {request.address}</small>:null}{legacyPayment.notes?<small>Observaciones: {legacyPayment.notes}</small>:null}<small>Pago solicitado: {cashOnDelivery?"Efectivo al recibir (a confirmar)":"Transferencia bancaria"}</small></div>
   </div>
  </details>
  <div className="whatsapp-finance-summary">
   <div><small>Productos</small><strong>{ars(Number(request.subtotal))}</strong></div>
   <div><small>Envío confirmado</small><strong>{request.shipping_cost===null?"Pendiente":ars(Number(request.shipping_cost))}</strong></div>
   <div><small>Total final</small><strong>{finalTotal===null?"Pendiente":ars(finalTotal)}</strong></div>
   <div><small>Pagos registrados</small><strong>{ars(received)}</strong></div>
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
  {request.payment_status==="partial"?<p className="hint">{cashOnDelivery?"Hay un pago parcial registrado. El saldo restante debe cobrarse efectivamente al entregar.":"Pago parcial registrado. El pedido no pasará a preparación hasta completar el saldo."}</p>:null}
  {canRegisterPayment&&!cashOnDelivery?<form className="whatsapp-request-form" onSubmit={event=>void registerPayment(event)}>
   <h3>2. Registrar transferencia acreditada</h3>
   <label>Importe recibido (ARS)<input required type="number" inputMode="decimal" min="0.01" step="0.01"
    max={remaining??undefined} placeholder={remaining===null?"":String(remaining)}
    value={paymentAmount} onChange={event=>setPaymentAmount(event.target.value)} disabled={busy}/></label>
   <label>Referencia bancaria (opcional)<input maxLength={100} value={bankReference}
    onChange={event=>setBankReference(event.target.value)} disabled={busy} placeholder="Número de operación, si está disponible"/></label>
   <button type="submit" className="btn tiny" disabled={busy}>Registrar importe recibido</button>
   <small>Solo anotá dinero efectivamente acreditado. Si es parcial, el saldo se conserva.</small>
  </form>:null}
  {canRegisterCash?<div className="whatsapp-request-form"><h3>3. Cobro al entregar</h3><p className="hint">Registrá el efectivo únicamente después de recibirlo físicamente. No marques entregado antes de cobrar el saldo.</p><button type="button" className="btn tiny" disabled={busy} onClick={()=>void registerCash()}>Registrar efectivo recibido · {ars(remaining??0)}</button></div>:null}
  {request.whatsapp_request_payments?.length?<details className="whatsapp-payment-history"><summary>Ver pagos registrados ({request.whatsapp_request_payments.length})</summary>
   {request.whatsapp_request_payments.map(payment=><small key={payment.id}>{ars(Number(payment.amount))} · {payment.payment_method==="cash"?"Efectivo":"Transferencia"} · {new Date(payment.created_at).toLocaleString("es-AR")}{payment.transfer_reference?` · Ref. ${payment.transfer_reference}`:""}</small>)}
  </details>:null}
  <div className="whatsapp-request-actions">
   {next?<button className="btn tiny" type="button" disabled={busy||blockedConfirm||blockedPreparing||blockedDelivered}
    onClick={()=>void move(next.action)}>{next.label}</button>:null}
   {blockedConfirm?<small>Primero guardá stock y costo de envío.</small>:null}
   {blockedPreparing?<small>Para transferencia, primero acreditá el pago completo.</small>:null}
   {blockedDelivered?<small>Primero registrá el cobro efectivo antes de marcar la entrega.</small>:null}
   {request.payment_status==="pending"&& !["cancelled","delivered"].includes(request.status)?
    <button type="button" className="btn tiny danger" disabled={busy} onClick={()=>void move("cancel")}>Cancelar</button>:null}
  </div>
  {error?<p role="alert" className="notification notification-error">{error}</p>:null}
  {notice?<p role="status" className="hint">{notice}</p>:null}
 </article>;
}
const filterOptions:{id:WhatsAppAdminFilter;label:string}[]=[
 {id:"attention",label:"Necesitan atención"},
 {id:"processing",label:"En curso"},
 {id:"payment",label:"Con saldo"},
 {id:"finished",label:"Finalizados"},
 {id:"all",label:"Todos"}
];
export function WhatsAppRequests({requests,freeShippingThreshold=60000}:{requests:WhatsAppRequest[];freeShippingThreshold?:number}){
 const [filter,setFilter]=useState<WhatsAppAdminFilter>("attention");
 const [search,setSearch]=useState("");
 const counts=useMemo(()=>whatsappRequestCounts(requests),[requests]);
 const visible=useMemo(()=>searchWhatsAppRequests(requests,search,filter),[requests,search,filter]);
 return <section className="panel whatsapp-admin-panel">
  <div className="whatsapp-admin-heading"><div><h2>Pedidos por WhatsApp</h2><p className="hint">Primero verificá el contacto, después stock y entrega. Registrá pagos únicamente cuando el dinero se reciba.</p></div>
   <button type="button" className="btn ghost" onClick={()=>{setFilter("attention");setSearch("");}}>Ver pendientes</button>
  </div>
  <div className="whatsapp-admin-metrics" aria-label="Resumen de pedidos recientes">
   <div><small>Necesitan atención</small><strong>{counts.attention}</strong></div>
   <div><small>En curso</small><strong>{counts.processing}</strong></div>
   <div><small>Con saldo pendiente</small><strong>{counts.payment}</strong></div>
   <div><small>Finalizados</small><strong>{counts.finished}</strong></div>
  </div>
  <div className="whatsapp-admin-filters" aria-label="Filtrar pedidos por WhatsApp">
   {filterOptions.map(option=><button type="button" key={option.id} className={filter===option.id?"active":""}
    aria-pressed={filter===option.id} onClick={()=>setFilter(option.id)}>{option.label} <span>{counts[option.id]}</span></button>)}
  </div>
  <div className="whatsapp-admin-search">
   <label>Buscar un pedido<input type="search" value={search} onChange={event=>setSearch(event.target.value)}
    placeholder="Cliente, referencia, localidad, producto o SKU"/></label>
   {search?<button type="button" className="btn tiny" onClick={()=>setSearch("")}>Limpiar búsqueda</button>:null}
  </div>
  <p className="hint" aria-live="polite">{visible.length} resultados · {requests.length} solicitudes recientes cargadas (máximo 100)</p>
  <div className="whatsapp-request-list">{visible.map(request=><RequestCard key={request.id} request={request} freeShippingThreshold={freeShippingThreshold}/>)}</div>
  {!visible.length?<div className="whatsapp-admin-empty"><strong>{search?"No encontramos pedidos con esa búsqueda":filter==="attention"?"No hay pedidos que necesiten atención":"No hay pedidos en este estado"}</strong>
   <p>Probá otra búsqueda o revisá todas las solicitudes recientes.</p>
   <button type="button" className="btn ghost" onClick={()=>{setFilter("all");setSearch("");}}>Mostrar todos</button>
  </div>:null}
  <p className="whatsapp-admin-footnote">Los contadores muestran las últimas 100 solicitudes, no las ventas históricas. Un pedido puede figurar «En curso» y «Con saldo» al mismo tiempo. «Mensaje preparado» no significa que el cliente lo haya enviado.</p>
 </section>;
}
