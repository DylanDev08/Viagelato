import Link from "next/link";
import {ArrowUpRight,Instagram,MapPin,MessageCircle,Phone} from "lucide-react";
import {whatsappHref} from "@/lib/whatsapp";
import type {Settings} from "@/lib/types";

function confirmedAddress(value:string){
 const address=value.trim();
 return address.length>5&&!/^(ubicaci[oó]n a confirmar|a confirmar|pendiente|sin definir)$/i.test(address)?address:null;
}

function googleMapsHref(value:string){
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.username||url.password)return null;
  if(url.hostname==="maps.app.goo.gl")return url.href;
  if((url.hostname==="www.google.com"||url.hostname==="google.com"||url.hostname==="maps.google.com")&&url.pathname.startsWith("/maps"))return url.href;
 }catch{/* Sin dirección de Google Maps configurada */}
 return null;
}

export function SiteFooter({settings}:{settings:Settings}){
 const whatsapp=whatsappHref(settings.whatsapp);
 const address=confirmedAddress(settings.address);
 const map=address?googleMapsHref(settings.maps_url):null;
 return <footer className="site-footer storefront-footer">
  <div className="shell footer-main">
   <div className="footer-intro"><span className="brand-seal inverse">V</span><h2>Del catálogo<br/>a tu negocio.</h2><p>Distribución de helados y congelados, con consultas y entregas coordinadas por nuestro equipo comercial.</p><Link className="footer-brand-link" href="/nosotros">Conocé Viagelato <ArrowUpRight size={15}/></Link></div>
   <div><h3>Explorar</h3><Link href="/catalogo">Productos y precios</Link><Link href="/nosotros">Nosotros</Link><Link href="/envios">Entregas y cobertura</Link><Link href="/carrito">Mi carrito</Link></div>
   <div><h3>Ayuda y políticas</h3><Link href="/contacto">Atención al cliente</Link><Link href="/politicas/devoluciones">Cambios y devoluciones</Link><Link href="/politicas/privacidad">Política de privacidad</Link><Link href="/terminos">Términos y condiciones</Link><Link className="footer-cancellation" href="/arrepentimiento">Botón de arrepentimiento</Link></div>
   <div className="footer-contact"><h3>Contacto y ubicación</h3>{whatsapp&&<a className="footer-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>WhatsApp comercial</a>}{settings.phone&&<a href={`tel:${settings.phone.replace(/\D/g,"")}`}><Phone size={15}/>{settings.phone}</a>}{settings.instagram&&<a href={settings.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={15}/>@distribuidorviagelato</a>}
    <div className="footer-location"><MapPin size={17} aria-hidden="true"/><div><strong>{address?"Dirección comercial":"Ubicación comercial"}</strong>{address?<p>{address}</p>:<p>Consultá nuestra ubicación exacta por WhatsApp o desde Contacto.</p>}{map&&<a href={map} target="_blank" rel="noopener noreferrer">Cómo llegar <ArrowUpRight size={14}/></a>}{!address&&<Link href="/contacto">Consultar ubicación <ArrowUpRight size={14}/></Link>}</div></div>
   </div>
  </div>
  <div className="shell footer-bottom"><span>© {new Date().getFullYear()} {settings.name}</span><span>Precios, stock y entrega sujetos a confirmación comercial.</span><Link className="footer-admin-entry" href="/admin">Acceso administración</Link></div>
 </footer>;
}
