import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {ArrowRight,CheckCircle2,MapPin,MessageCircle,PackageCheck,Snowflake,Truck} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {whatsappHref} from "@/lib/whatsapp";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Nosotros",description:"Conocé Viagelato S.A., distribución de helados y congelados con entregas coordinadas en Zona Sur."};

export default async function AboutPage(){
 const {settings}=await getStore();
 const whatsapp=whatsappHref(settings.whatsapp);
 return <SiteShell settings={settings}><main className="page-main about-refresh">
  <section className="about-hero">
   <div className="shell about-hero-grid">
    <div className="about-hero-copy"><p className="kicker">NOSOTROS · VIAGELATO S.A.</p><h1>Lo que vendés merece una buena entrega.</h1><p>Somos una empresa de logística y distribución de helados y productos congelados. Trabajamos con atención directa, información clara y entregas coordinadas en Zona Sur de Buenos Aires.</p><div className="about-hero-buttons"><Link className="primary-action" href="/catalogo">Conocer los productos <ArrowRight size={18}/></Link><Link className="secondary-action" href="/contacto">Hablemos</Link></div></div>
    <div className="about-photo"><Image src="/catalogo/img-20261023-wa0103.webp" alt="Presentación de productos helados del catálogo de Viagelato" fill priority sizes="(max-width: 900px) 100vw, 45vw"/><div className="about-photo-tag"><Snowflake size={16}/><span>HELADOS Y CONGELADOS</span></div></div>
   </div>
  </section>
  <section className="shell about-intro"><div><p className="kicker">QUÉ HACEMOS</p><h2>Menos vueltas. Más claridad en cada pedido.</h2></div><div><p>{settings.description}</p><p>Elegí los productos desde el catálogo, agregalos al carrito y enviá tu pedido. Nuestro equipo confirma la disponibilidad y coordina la entrega o el retiro.</p><Link className="text-link" href="/envios">Ver zonas de entrega <ArrowRight size={16}/></Link></div></section>
  <section className="about-benefits shell" aria-label="Nuestra forma de trabajar">
   <article><span className="about-benefit-icon"><PackageCheck/></span><small>01 · PRODUCTOS</small><h3>Catálogo para elegir fácil</h3><p>Presentaciones, variedades y precios visibles para armar tu selección.</p></article>
   <article><span className="about-benefit-icon"><MessageCircle/></span><small>02 · ATENCIÓN</small><h3>Una conversación directa</h3><p>Confirmamos la disponibilidad y los detalles del pedido por WhatsApp.</p></article>
   <article><span className="about-benefit-icon"><Truck/></span><small>03 · DISTRIBUCIÓN</small><h3>Entregas coordinadas</h3><p>Acordamos cobertura, modalidad y costo de envío antes de cerrar el pedido.</p></article>
  </section>
  <section className="about-process"><div className="shell about-process-grid"><div><p className="kicker">ASÍ TRABAJAMOS</p><h2>Del primer producto a la coordinación final.</h2><p>Un proceso pensado para comprar sin sorpresas y con acompañamiento comercial.</p></div><ol><li><span>01</span><div><strong>Elegís productos</strong><p>Explorá categorías y agregá presentaciones al carrito.</p></div><CheckCircle2 size={18}/></li><li><span>02</span><div><strong>Enviás tu pedido</strong><p>Elegís entrega o retiro, seleccionás el pago y enviás el carrito por WhatsApp.</p></div><CheckCircle2 size={18}/></li><li><span>03</span><div><strong>Coordinamos los detalles</strong><p>Confirmamos stock, entrega, importe final y forma de pago.</p></div><CheckCircle2 size={18}/></li></ol></div></section>
  <section className="shell about-final"><div><p className="kicker"><MapPin size={15}/> ZONA SUR · BUENOS AIRES</p><h2>¿Querés hacer un pedido o consultar cobertura?</h2><p>Armá tu carrito y enviá el pedido completo. También podés consultar la cobertura antes de comprar.</p></div>{whatsapp?<a className="primary-action" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Consultar por WhatsApp <ArrowRight size={17}/></a>:<Link className="primary-action" href="/contacto">Ir a contacto <ArrowRight size={17}/></Link>}</section>
 </main></SiteShell>;
}
