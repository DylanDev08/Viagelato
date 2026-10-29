import Link from "next/link";
import {Instagram,MessageCircle,Phone} from "lucide-react";
import {whatsappHref} from "@/lib/whatsapp";
import type {Settings} from "@/lib/types";

export function SiteFooter({settings}:{settings:Settings}){
 const whatsapp=whatsappHref(settings.whatsapp);
 return <footer className="site-footer">
  <div className="shell footer-main">
   <div className="footer-intro"><span className="brand-seal inverse">V</span><h2>Cadena de frío.<br/>Criterio comercial.</h2><p>{settings.description}</p></div>
   <div><h3>Explorar</h3><Link href="/catalogo">Catálogo</Link><Link href="/nosotros">La empresa</Link><Link href="/envios">Zonas de entrega</Link><Link href="/contacto">Contacto</Link></div>
   <div><h3>Información</h3><Link href="/terminos">Términos y condiciones</Link><Link href="/politicas/privacidad">Privacidad</Link><Link href="/politicas/devoluciones">Cambios y devoluciones</Link><Link href="/arrepentimiento">Botón de arrepentimiento</Link></div>
   <div><h3>Contacto</h3>{whatsapp&&<a className="footer-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>WhatsApp</a>}{settings.phone&&<a href={`tel:${settings.phone.replace(/\D/g,"")}`}><Phone size={15}/>{settings.phone}</a>}{settings.instagram&&<a href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={15}/>Instagram</a>}<p>Zona sur, Buenos Aires</p></div>
  </div>
  <div className="shell footer-bottom"><span>© {new Date().getFullYear()} {settings.name}</span><span>Venta sujeta a disponibilidad y confirmación.</span><Link className="footer-admin-entry" href="/admin">Acceso administración</Link></div>
 </footer>;
}
