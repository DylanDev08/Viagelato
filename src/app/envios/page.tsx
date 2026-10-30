import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,MapPin,Truck} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {ars,DELIVERY_AREAS} from "@/lib/types";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Envíos",description:"Zonas y condiciones generales de entrega de Viagelato."};
export default async function ShippingPage(){const {settings}=await getStore();return <SiteShell settings={settings}><main className="page-main"><section className="page-hero shell"><p className="kicker">COBERTURA</p><h1>Entregas coordinadas<br/>en zona sur.</h1><p>Estas son nuestras zonas habituales de entrega. Confirmamos disponibilidad, fecha y costo antes de cerrar el pedido.</p></section><section className="shell shipping-layout"><div className="zone-panel"><div className="zone-heading"><MapPin/><h2>Zonas de entrega</h2></div><div className="zone-list">{DELIVERY_AREAS.map((area,index)=><span key={area}><b>{String(index+1).padStart(2,"0")}</b>{area}</span>)}</div></div><div className="shipping-notes"><article><Truck/><div><h3>Condiciones</h3><p>En las zonas habilitadas, el envío puede ser sin cargo desde {ars(settings.free_shipping_threshold)}. Confirmamos la promoción y cualquier costo antes de despachar.</p></div></article><article><MapPin/><div><h3>Otras ubicaciones</h3><p>¿Tu zona no aparece? Podés indicar la dirección en el carrito y confirmaremos si llegamos.</p></div></article><p className="legal-note">Los productos congelados deben ser recibidos en el horario acordado y conservados de inmediato según las indicaciones del fabricante.</p><Link className="primary-action" href="/catalogo">Explorar productos <ArrowRight/></Link></div></section></main></SiteShell>}
