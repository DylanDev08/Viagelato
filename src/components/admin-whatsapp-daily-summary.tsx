"use client";
import {useState} from "react";
import {ars} from "@/lib/types";

type Summary={
 day:string;prepared_count:number;confirmed_count:number;confirmed_amount:number;
 transfer_received:number;cash_received:number;outstanding_amount:number;
};
function localDay(){
 const parts=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date());
 const get=(name:string)=>parts.find(part=>part.type===name)?.value??"";
 return [get("year"),get("month"),get("day")].join("-");
}
export function DailyWhatsAppSummary(){
 const [day,setDay]=useState(localDay);
 const [loading,setLoading]=useState(false);
 const [data,setData]=useState<Summary|null>(null);
 const [error,setError]=useState("");
 async function load(){
  setLoading(true);setError("");setData(null);
  try{
   const response=await fetch("/api/admin/whatsapp-summary?day="+encodeURIComponent(day),{cache:"no-store"});
   const json=await response.json().catch(()=>({error:"Respuesta no disponible"}));
   if(!response.ok)throw new Error(json.error||"No se pudo consultar el resumen");
   setData(json as Summary);
  }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo consultar el resumen");}
  finally{setLoading(false);}
 }
 return <section className="whatsapp-daily-summary" aria-label="Resumen diario de pedidos y cobros">
  <div className="whatsapp-daily-head">
   <div><h3>Resumen del día</h3><p>Pedidos confirmados y dinero efectivamente recibido. Los mensajes preparados no se cuentan como ventas.</p></div>
   <div className="whatsapp-daily-controls"><label>Fecha<input type="date" value={day} onChange={event=>{setDay(event.target.value);setData(null);setError("");}}/></label>
    <button type="button" className="btn tiny" disabled={loading||!day} onClick={()=>void load()}>{loading?"Consultando…":"Consultar resumen"}</button></div>
  </div>
  {error?<p className="notification notification-error" role="alert">{error}</p>:null}
  {data?<div className="whatsapp-daily-content">
   <div className="whatsapp-daily-values">
    <div><small>Mensajes preparados</small><strong>{Number(data.prepared_count)}</strong></div>
    <div><small>Pedidos confirmados (sin cancelados)</small><strong>{Number(data.confirmed_count)}</strong></div>
    <div><small>Importe de esos pedidos</small><strong>{ars(Number(data.confirmed_amount))}</strong></div>
    <div><small>Transferencias recibidas ese día</small><strong>{ars(Number(data.transfer_received))}</strong></div>
    <div><small>Efectivo recibido ese día</small><strong>{ars(Number(data.cash_received))}</strong></div>
    <div><small>Saldo actual de esos pedidos</small><strong>{ars(Number(data.outstanding_amount))}</strong></div>
   </div>
   <p>Las cobranzas del día pueden corresponder a pedidos anteriores. El saldo de pedidos confirmados en esa fecha refleja su estado actual y puede cambiar con nuevos cobros.</p>
  </div>:<p className="whatsapp-daily-placeholder">Elegí una fecha y consultá los resultados. Los datos se calculan desde todos los movimientos registrados.</p>}
 </section>;
}
