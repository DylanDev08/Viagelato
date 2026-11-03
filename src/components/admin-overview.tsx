"use client";
import type {Product} from "@/lib/types";

type OverviewTab="requests"|"products"|"zones";
type OverviewCounts={attention:number;payment:number};
export function AdminOverview({counts,products,requestsLoaded,busy,onNavigate}:{
 counts:OverviewCounts;
 products:Product[];
 requestsLoaded:number;
 busy:boolean;
 onNavigate:(tab:OverviewTab)=>void;
}){
 const published=products.filter(p=>p.active).length;
 const lowStock=products.filter(p=>p.active&&p.stock<=5).length;
 return <>
 <div className="stats admin-overview-stats"><article><small>WhatsApp por atender</small><strong>{counts.attention}</strong><button type="button" className="admin-stat-link" onClick={()=>onNavigate("requests")}>Ver bandeja</button></article><article><small>Solicitudes con saldo</small><strong>{counts.payment}</strong><span className="admin-stat-note">Revisar pagos pendientes</span></article><article><small>Productos publicados</small><strong>{published}</strong><span className="admin-stat-note">Disponibles en tienda</span></article><article><small>Stock bajo (≤5)</small><strong>{lowStock}</strong><span className="admin-stat-note">Revisar disponibilidad</span></article></div><p className="admin-metrics-context">Los indicadores de WhatsApp se calculan sobre {requestsLoaded} solicitudes cargadas; podés consultar las anteriores desde la bandeja. No representan todo el historial.</p><section className="panel admin-overview-actions"><h2>¿Qué necesitás hacer hoy?</h2><p>Revisá primero los pedidos que necesitan contacto o confirmación. Después podés actualizar productos, precios, fotos y zonas sin publicar datos incompletos.</p><div className="admin-quick-actions"><button className="btn primary" disabled={busy} onClick={()=>onNavigate("requests")}>Gestionar WhatsApp {counts.attention>0?`(${counts.attention})`:""}</button><button className="btn ghost" disabled={busy} onClick={()=>onNavigate("products")}>Administrar productos</button><button className="btn ghost" disabled={busy} onClick={()=>onNavigate("zones")}>Configurar entregas</button></div></section>
 </>;
}
