import type {Metadata} from "next";
import {ArrowUpRight,Instagram,MessageCircle,Phone} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {whatsappHref} from "@/lib/whatsapp";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Contacto",
 description:"Consultá por helados, congelados, zonas de distribución y entregas de Viagelato.",
 alternates:{canonical:"/contacto"}
};
export default async function ContactPage(){
 const {settings}=await getStore();
 const whatsapp=whatsappHref(settings.whatsapp);
 const phone=`tel:${settings.phone.replace(/\D/g,"")}`;
 return <SiteShell settings={settings}><main className="contact-page">
  <section className="shell contact-grid">
   <div className="contact-intro">
    <p className="kicker">CONTACTO COMERCIAL</p>
    <h1>Hablemos de<br/>tu próximo pedido.</h1>
    <p>¿Buscás helados y congelados para tu negocio? Contanos qué productos te interesan y en qué zona necesitás recibirlos.</p>
    {whatsapp?<a className="contact-whatsapp-cta" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true"/><span><strong>Escribinos por WhatsApp</strong><small>Abrir conversación</small></span><ArrowUpRight aria-hidden="true"/></a>:
     <a className="contact-whatsapp-cta contact-whatsapp-pending" href={phone}><Phone aria-hidden="true"/><span><strong>Llamanos para consultar</strong><small>WhatsApp pendiente de confirmar</small></span><ArrowUpRight aria-hidden="true"/></a>}
   </div>
   <div className="contact-channel-panel">
    <p className="kicker">OTRAS FORMAS DE CONTACTO</p>
    <div className="contact-options">
     <a href={phone}><Phone aria-hidden="true"/><span><small>TELÉFONO COMERCIAL</small><strong>{settings.phone}</strong></span><ArrowUpRight className="contact-option-arrow" aria-hidden="true"/></a>
     {settings.instagram&&<a href={settings.instagram} target="_blank" rel="noopener noreferrer"><Instagram aria-hidden="true"/><span><small>INSTAGRAM</small><strong>@distribuidorviagelato</strong></span><ArrowUpRight className="contact-option-arrow" aria-hidden="true"/></a>}
     {whatsapp&&<a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true"/><span><small>WHATSAPP</small><strong>Atención personalizada</strong></span><ArrowUpRight className="contact-option-arrow" aria-hidden="true"/></a>}
    </div>
   </div>
  </section>
  <section className="shell contact-note"><span>PARA AGILIZAR TU CONSULTA</span><p>Indicá tu localidad, el producto que buscás y la cantidad aproximada. Precios, disponibilidad y entregas se confirman de manera personalizada; esta consulta no genera un pedido.</p></section>
 </main></SiteShell>;
}
