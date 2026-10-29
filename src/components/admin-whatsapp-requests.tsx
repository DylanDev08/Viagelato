"use client";
import {useMemo,useState} from "react";
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
export function WhatsAppRequests({requests}:{requests:WhatsAppRequest[]}){
 const router=useRouter();
 const [status,setStatus]=useState("all");
 const [search,setSearch]=useState("");
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState("");
 const visible=useMemo(()=>requests.filter(request=>{
  const found=(request.customer_name+" "+request.locality+" "+whatsappRequestReference(request.id)).toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"));
  return found&&(status==="all"||request.status===status);
 }),[requests,search,status]);
 async function apply(id:string,action:string){
  if(action==="mark_paid"&&!window.confirm("¿Comprobaste que la transferencia está acreditada? Este cambio quedará registrado."))return;
  if(action==="confirmed"&&!window.confirm("¿El cliente confirmó el pedido y verificaste la disponibilidad?"))return;
  if(action==="delivered"&&!window.confirm("¿La mercadería fue entregada?"))return;
  if(action==="cancel"&&!window.confirm("¿Cancelar esta solicitud? No se modificará el stock."))return;
  setBusy(true);setFeedback("");
  try{
   const res=await fetch("/api/admin/whatsapp-requests",{method:"PATCH",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action})});
   const data=await res.json().catch(()=>({error:"Respuesta inválida"}));
   if(!res.ok)throw new Error(data.error||"No se pudo actualizar");
   setFeedback("Cambio guardado correctamente");
   router.refresh();
  }catch(error){setFeedback(error instanceof Error?error.message:"Error al guardar");}
  finally{setBusy(false);}
 }
 return <section className="panel">
  <h2>Solicitudes enviadas al paso de WhatsApp</h2>
  <p className="hint">Estas referencias se registran cuando el cliente presiona «Enviar pedido por WhatsApp». No podemos saber si realmente envió el mensaje: el primer estado siempre es «WhatsApp preparado». No se reserva stock ni se acredita un pago automáticamente.</p>
  <div className="admin-product-filters">
   <label>Buscar referencia o cliente<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Referencia, nombre o localidad"/></label>
   <label>Estado<select value={status} onChange={event=>setStatus(event.target.value)}>
    <option value="all">Todos</option>{Object.entries(labels).map(([key,value])=><option key={key} value={key}>{value}</option>)}
   </select></label>
  </div>
  <p className="hint" aria-live="polite">{visible.length} de {requests.length} solicitudes recientes</p>
  {feedback?<p role="status">{feedback}</p>:null}
  <div className="admin-list">{visible.map(request=>{
   const next=nextAction(request);
   return <article className="admin-list-row whatsapp-admin-request" key={request.id}>
    <div className="grow">
     <strong>{whatsappRequestReference(request.id)} · {request.customer_name}</strong>
     <small>{request.locality} · {request.shipping_method==="pickup"?"Retiro a confirmar":"Envío"} · {new Date(request.created_at).toLocaleString("es-AR")}</small>
     {request.address?<small>Dirección: {request.address}</small>:null}
     {request.notes?<small>Nota: {request.notes}</small>:null}
     <small>Pago: {request.payment_status==="paid"?"Acreditado manualmente":"Pendiente"}</small>
     <span className="status-pill">{labels[request.status]}</span>
    </div>
    <div className="grow">{request.items.map((item,index)=><small key={index}>{item.quantity} × {item.name} · {item.sku||"Sin SKU"} · {ars(item.price*item.quantity)}</small>)}</div>
    <div className="whatsapp-request-actions">
     <strong>{ars(Number(request.subtotal))}</strong>
     {next?<button type="button" className="btn tiny" disabled={busy} onClick={()=>void apply(request.id,next.action)}>{next.label}</button>:null}
     {request.payment_status!=="paid"&&["confirmed","preparing","shipped","delivered"].includes(request.status)?
      <button type="button" className="btn tiny" disabled={busy} onClick={()=>void apply(request.id,"mark_paid")}>Marcar transferencia acreditada</button>:null}
     {request.payment_status!=="paid"&&!["cancelled","delivered"].includes(request.status)?
      <button type="button" className="btn tiny danger" disabled={busy} onClick={()=>void apply(request.id,"cancel")}>Cancelar</button>:null}
    </div>
   </article>;
  })}</div>
  {!visible.length?<p className="hint">No hay solicitudes con esos filtros. Las nuevas referencias aparecerán aquí cuando los clientes abran el checkout hacia WhatsApp.</p>:null}
 </section>;
}
