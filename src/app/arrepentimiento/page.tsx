import type {Metadata} from "next";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Botón de arrepentimiento"};
export default async function CancellationPage(){const {settings}=await getStore();return <SiteShell settings={settings}><main className="shell legal-page"><p className="kicker">GESTIÓN DE COMPRA</p><h1>Botón de arrepentimiento</h1><div className="legal-content"><p>La gestión digital de arrepentimiento se habilitará junto con la venta online, una vez definidos el canal responsable, los datos legales y el procedimiento de devolución aplicable a productos congelados.</p><p>Hasta entonces, los pedidos reales permanecen deshabilitados. Para consultas sobre una operación coordinada por otro canal, comunicate al <a className="text-link" href={`tel:${settings.phone.replace(/\D/g,"")}`}>{settings.phone}</a>.</p><aside><strong>Función aún no habilitada</strong><p>No se muestra un formulario que aparente enviar solicitudes mientras no exista un circuito operativo configurado para recibirlas.</p></aside></div></main></SiteShell>}
