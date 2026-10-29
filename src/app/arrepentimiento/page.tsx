import type {Metadata} from "next";
import Link from "next/link";
import {ArrowUpRight,MessageCircle} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {whatsappHref} from "@/lib/whatsapp";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Botón de arrepentimiento"};

export default async function CancellationPage(){
 const {settings}=await getStore();
 const whatsapp=whatsappHref(settings.whatsapp,"Hola, quiero ejercer mi derecho de arrepentimiento respecto de una compra realizada a Viagelato. Solicito información sobre el procedimiento y constancia de mi solicitud.");
 return <SiteShell settings={settings}><main className="shell legal-page legal-refresh">
  <p className="kicker">ATENCIÓN AL CLIENTE</p><h1>Botón de arrepentimiento</h1>
  <div className="legal-refresh-grid"><div className="legal-refresh-main"><p className="legal-lead">Podés solicitar información o iniciar una consulta de revocación respecto de una compra realizada a distancia con Viagelato.</p>
   <section><h2>Cómo comunicar tu solicitud</h2><p>Hacé clic en el canal de contacto, enviá el mensaje e indicá tu nombre, fecha de compra y referencia del pedido, si la tenés. Abrir WhatsApp solamente prepara el mensaje: es necesario enviarlo para que la empresa pueda recibirlo.</p></section>
   <section><h2>Condiciones según el producto</h2><p>La normativa contempla supuestos especiales para bienes perecederos. La evaluación del caso dependerá de la naturaleza del producto y del marco legal aplicable, sin afectar otros derechos por defectos o incumplimientos.</p></section>
   <section><h2>Seguimiento</h2><p>Conservá el comprobante del contacto realizado. El circuito de recepción automática y generación de código de seguimiento todavía requiere configuración por parte de la empresa.</p></section>
  </div><aside className="legal-contact-card"><MessageCircle size={25}/><h2>Contactar a Viagelato</h2><p>Podés comunicar la solicitud sin iniciar sesión.</p>{whatsapp?<a className="primary-action" href={whatsapp} target="_blank" rel="noopener noreferrer">Iniciar solicitud <ArrowUpRight size={17}/></a>:<Link className="primary-action" href="/contacto">Ver medios de contacto <ArrowUpRight size={17}/></Link>}<small>El envío y la recepción de la solicitud no se confirman automáticamente desde esta página.</small></aside></div>
 </main></SiteShell>;
}
