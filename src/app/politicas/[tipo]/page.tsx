import {notFound} from "next/navigation";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";

export const dynamic="force-dynamic";
export default async function Policies({params}:{params:Promise<{tipo:string}>}){const {tipo}=await params;const {settings}=await getStore();if(!["privacidad","devoluciones"].includes(tipo))notFound();const title=tipo==="privacidad"?"Política de privacidad":"Cambios y devoluciones";const content=tipo==="privacidad"?settings.privacy_policy:settings.returns_policy;return <SiteShell settings={settings}><main className="shell legal-page"><p className="kicker">INFORMACIÓN LEGAL</p><h1>{title}</h1><div className="legal-content"><p style={{whiteSpace:"pre-wrap"}}>{content}</p><aside><strong>Documento pendiente de validación</strong><p>Antes de publicar la tienda, este texto debe completarse con los datos fiscales, comerciales y jurídicos definitivos de Viagelato S.A.</p></aside></div></main></SiteShell>}
