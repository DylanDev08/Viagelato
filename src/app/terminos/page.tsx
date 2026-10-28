import type {Metadata} from "next";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Términos y condiciones"};
export default async function TermsPage(){const {settings}=await getStore();return <SiteShell settings={settings}><main className="shell legal-page"><p className="kicker">INFORMACIÓN LEGAL</p><h1>Términos y condiciones</h1><div className="legal-content"><p>La navegación y el armado del carrito no constituyen por sí mismos una compraventa confirmada. Toda solicitud queda sujeta a validación de stock, precio, cobertura, costo de entrega y forma de pago por parte de Viagelato S.A.</p><p>Los textos legales definitivos, datos fiscales, jurisdicción, mecanismos de pago y condiciones comerciales deben validarse antes de habilitar pedidos reales.</p><aside><strong>Versión de preparación</strong><p>Esta página deja visible el espacio legal necesario, pero no reemplaza la revisión profesional correspondiente.</p></aside></div></main></SiteShell>}
