import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,MapPin,Truck} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {ars,DELIVERY_AREAS} from "@/lib/types";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Envíos",description:"Zonas y condiciones generales de entrega de Viagelato."};
export default async function ShippingPage(){const {settings}=await getStore();return <SiteShell settings={settings}><main className="page-main"><section className="page-hero shell"><p className="kicker">COBERTURA</p><h1>Entregas coordinadas<br/>en Zona Sur y CABA.</h1><p>Repartimos en las siguientes localidades.</p></section><section className="shell shipping-layout"><div className="zone-panel"><div className="zone-heading"><MapPin/><h2>Zonas de entrega</h2></div><div className="zone-list">{DELIVERY_AREAS.map((area,index)=><span key={area}><b>{String(index+1).padStart(2,"0")}</b>{area}</span>)}</div></div><div className="shipping-notes"><article><Truck/><div><h3>Condiciones</h3><p>Envío gratis desde {ars(settings.free_shipping_threshold)} en las zonas indicadas. Para pedidos menores, consultá la tarifa de entrega.</p></div></article><article><MapPin/><div><h3>Otras ubicaciones</h3><p>Fuera de estas zonas, consultá disponibilidad y costo por WhatsApp.</p></div></article>{settings.pickup_enabled?<article><Truck/><div><h3>Retiro gratuito en el local</h3><p>Podés retirar sin costo y sin compra mínima en {settings.address}. Coordinamos disponibilidad y horario por WhatsApp antes de que vengas.</p></div></article>:null}<p className="legal-note">Los productos congelados deben ser recibidos en el horario acordado y conservados de inmediato según las indicaciones del fabricante.</p><Link className="primary-action" href="/contacto">Consultar mi zona <ArrowRight/></Link></div></section></main></SiteShell>}
