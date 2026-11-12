"use client";
import type {Product,ShippingZone} from "@/lib/types";
import {commercialReadiness} from "@/lib/commercial-readiness";

type OverviewTab="requests"|"products"|"zones";
type OverviewCounts={attention:number;payment:number};
export function AdminOverview({counts,products,zones,requestsLoaded,busy,onNavigate}:{
 counts:OverviewCounts;
 products:Product[];
 zones:ShippingZone[];
 requestsLoaded:number;
 busy:boolean;
 onNavigate:(tab:OverviewTab)=>void;
}){
 const published=products.filter(p=>p.active).length;
 const lowStock=products.filter(p=>p.active&&p.stock<=5).length;
 const readiness=commercialReadiness(products,zones);
 return <>
 <div className="stats admin-overview-stats"><article><small>WhatsApp por atender</small><strong>{counts.attention}</strong><button type="button" className="admin-stat-link" onClick={()=>onNavigate("requests")}>Ver bandeja</button></article><article><small>Solicitudes con saldo</small><strong>{counts.payment}</strong><span className="admin-stat-note">Revisar pagos pendientes</span></article><article><small>Productos publicados</small><strong>{published}</strong><span className="admin-stat-note">Disponibles en tienda</span></article><article><small>Stock bajo (≤5)</small><strong>{lowStock}</strong><span className="admin-stat-note">Revisar disponibilidad</span></article></div><p className="admin-metrics-context">Los indicadores de WhatsApp corresponden a las últimas {requestsLoaded} solicitudes cargadas (máximo 100), no al historial completo.</p>
 <section className="panel admin-commerce-readiness" aria-label="Preparación comercial">
  <div className="admin-commerce-intro"><h2>Preparación comercial</h2><p>Qué falta verificar antes de confirmar productos y entregas.</p></div>
  <div className="admin-commerce-metrics">
   <div><small>Visibles para consulta</small><strong>{readiness.visibleForInquiry}</strong><span>{readiness.awaitingVerification} sin verificación comercial</span></div>
   <div><small>Sin stock confirmado</small><strong>{readiness.withoutConfirmedStock}</strong><span>Revisar cantidades disponibles</span></div>
   <div><small>Zonas con tarifa validada</small><strong>{readiness.areasWithConfirmedTariff} / {readiness.commercialAreas}</strong><span>Para pedidos por debajo del mínimo</span></div>
  </div>
  <div className="admin-commerce-actions">
   <button className="btn ghost" type="button" disabled={busy} onClick={()=>onNavigate("products")}>Revisar productos</button>
   <button className="btn ghost" type="button" disabled={busy} onClick={()=>onNavigate("zones")}>Configurar tarifas</button>
  </div>
  <p className="admin-commerce-note">Los artículos visibles para consulta no equivalen a stock confirmado. No se habilitan productos ni tarifas automáticamente.</p>
 </section>
 <section className="panel admin-overview-actions"><h2>¿Qué necesitás hacer hoy?</h2><p>Revisá primero los pedidos que necesitan contacto o confirmación. Después podés actualizar productos, precios, fotos y zonas sin publicar datos incompletos.</p><div className="admin-quick-actions"><button className="btn primary" disabled={busy} onClick={()=>onNavigate("requests")}>Gestionar WhatsApp {counts.attention>0?`(${counts.attention})`:""}</button><button className="btn ghost" disabled={busy} onClick={()=>onNavigate("products")}>Administrar productos</button><button className="btn ghost" disabled={busy} onClick={()=>onNavigate("zones")}>Configurar entregas</button></div></section>
 </>;
}
