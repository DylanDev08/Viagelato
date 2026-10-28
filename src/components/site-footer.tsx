import Link from "next/link";
import {Instagram,Phone} from "lucide-react";
import type {Settings} from "@/lib/types";

export function SiteFooter({settings}:{settings:Settings}){
 return <footer className="site-footer">
  <div className="shell footer-main">
   <div className="footer-intro"><span className="brand-seal inverse">V</span><h2>Cadena de frío.<br/>Criterio comercial.</h2><p>{settings.description}</p></div>
   <div><h3>Explorar</h3><Link href="/catalogo">Catálogo en preparación</Link><Link href="/productos">Productos publicados</Link><Link href="/nosotros">La empresa</Link><Link href="/envios">Zonas de entrega</Link><Link href="/contacto">Contacto</Link></div>
   <div><h3>Información</h3><Link href="/terminos">Términos y condiciones</Link><Link href="/politicas/privacidad">Privacidad</Link><Link href="/politicas/devoluciones">Cambios y devoluciones</Link><Link href="/arrepentimiento">Botón de arrepentimiento</Link></div>
   <div><h3>Contacto</h3>{settings.phone&&<a href={`tel:${settings.phone.replace(/\D/g,"")}`}><Phone size={15}/>{settings.phone}</a>}{settings.instagram&&<a href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={15}/>Instagram</a>}<p>Zona sur, Buenos Aires</p></div>
  </div>
  <div className="shell footer-bottom"><span>© {new Date().getFullYear()} {settings.name}</span><span>Venta sujeta a disponibilidad y confirmación.</span></div>
 </footer>;
}
