import type {Metadata} from "next";
import {notFound} from "next/navigation";
import Link from "next/link";
import {ArrowUpRight,MessageCircle} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {whatsappHref} from "@/lib/whatsapp";

export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{tipo:string}>}):Promise<Metadata>{
 const {tipo}=await params;
 if(!["privacidad","devoluciones"].includes(tipo))return {title:"Política no encontrada",robots:{index:false,follow:false}};
 return {title:tipo==="privacidad"?"Política de privacidad":"Cambios y devoluciones",alternates:{canonical:`/politicas/${tipo}`}};
}

export default async function Policies({params}:{params:Promise<{tipo:string}>}){
 const {tipo}=await params;
 if(!["privacidad","devoluciones"].includes(tipo))notFound();
 const {settings}=await getStore();
 const returns=tipo==="devoluciones";
 const title=returns?"Cambios y devoluciones":"Política de privacidad";
 const content=returns?settings.returns_policy:settings.privacy_policy;
 const configured=content.trim().length>60&&!/pendiente|sujeta a validaci[oó]n/i.test(content);
 const whatsapp=whatsappHref(settings.whatsapp,returns?"Hola, quiero consultar por un cambio, devolución o problema con un pedido de Viagelato.":"Hola, quiero consultar sobre mis datos personales en Viagelato.");
 return <SiteShell settings={settings}><main className="shell legal-page legal-refresh">
  <p className="kicker">INFORMACIÓN PARA CLIENTES</p><h1>{title}</h1>
  {returns?<div className="legal-refresh-grid">
   <div className="legal-refresh-main"><p className="legal-lead">Si recibiste un producto con un problema o necesitás consultar por un cambio o devolución, queremos conocer lo ocurrido y revisar tu caso.</p>
    <section><h2>¿Cómo hacer una consulta?</h2><p>Escribinos por nuestros canales de atención. Indicá tu nombre, la referencia del pedido si la tenés, qué producto es y cuál fue el inconveniente. Si contás con fotos del producto o su envase, podés adjuntarlas para facilitar la revisión.</p></section>
    <section><h2>Productos congelados y cadena de frío</h2><p>Los productos requieren conservación bajo las condiciones indicadas por el fabricante. Por su naturaleza, las condiciones de una devolución pueden variar según el motivo, el estado del producto y la normativa aplicable.</p><p>Los reclamos por productos defectuosos, errores de entrega u otros derechos legales se evalúan conforme a la normativa de defensa del consumidor. La condición de alimento congelado no elimina esos derechos.</p></section>
    <section><h2>¿Cuándo se confirma una solución?</h2><p>El equipo comercial revisará los datos y comunicará las opciones correspondientes. No se presume que un cambio, un reintegro o un retiro esté aprobado hasta su confirmación expresa.</p></section>
    {configured&&<section className="legal-custom"><h2>Condiciones comerciales de Viagelato</h2><p style={{whiteSpace:"pre-wrap"}}>{content}</p></section>}
   </div><aside className="legal-contact-card"><MessageCircle size={25}/><h2>¿Necesitás ayuda con un pedido?</h2><p>Tené a mano la referencia de la solicitud y contanos qué pasó.</p>{whatsapp?<a className="primary-action" href={whatsapp} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <ArrowUpRight size={17}/></a>:<Link className="primary-action" href="/contacto">Ir a contacto <ArrowUpRight size={17}/></Link>}<small>{configured?"Consultá también las condiciones comerciales detalladas.":"Las condiciones comerciales definitivas están pendientes de validación por la empresa."}</small></aside>
  </div>:<div className="legal-refresh-grid"><div className="legal-refresh-main"><p className="legal-lead">La información que brindás al solicitar productos se utiliza para atender tu consulta y coordinar el pedido.</p><section><h2>Datos que solicitamos</h2><p>Nombre, localidad, productos elegidos y, cuando lo indicás, dirección de entrega y observaciones. El sitio también procesa datos técnicos necesarios para el funcionamiento y la prevención de abuso.</p></section><section><h2>Finalidad del tratamiento</h2><p>Usamos esos datos para preparar tu consulta por WhatsApp y permitir el seguimiento comercial de tu solicitud. Abrir el enlace no significa que el mensaje haya sido enviado.</p></section><section><h2>Consultas sobre privacidad</h2><p>Podés comunicarte con la empresa para consultar sobre tus datos o solicitar su rectificación o eliminación cuando corresponda.</p></section>{configured&&<section className="legal-custom"><h2>Política declarada por la empresa</h2><p style={{whiteSpace:"pre-wrap"}}>{content}</p></section>}</div><aside className="legal-contact-card"><MessageCircle size={25}/><h2>¿Tenés una consulta sobre tus datos?</h2><p>Usá nuestros canales comerciales para comunicarte con Viagelato.</p>{whatsapp?<a className="primary-action" href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp <ArrowUpRight size={17}/></a>:<Link className="primary-action" href="/contacto">Ir a contacto <ArrowUpRight size={17}/></Link>}<small>{configured?"Consultá el texto detallado publicado por Viagelato.":"Documento de privacidad definitivo pendiente de validación."}</small></aside></div>}
  <p className="legal-disclaimer">Información orientativa sobre el circuito de atención. Las condiciones legales definitivas requieren validación de Viagelato S.A.</p>
 </main></SiteShell>;
}
