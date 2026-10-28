import type {Metadata} from "next";
import {AlertTriangle} from "lucide-react";
import {ProvisionalCatalog} from "@/components/provisional-catalog";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {PROVISIONAL_ASSETS} from "@/lib/provisional-catalog";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Catálogo en preparación",description:"Material visual provisional de Viagelato, pendiente de validación comercial."};
export default async function ProvisionalCatalogPage(){const {settings}=await getStore();return <SiteShell settings={settings}><main className="page-main"><section className="page-hero shell"><p className="kicker">CATÁLOGO EN PREPARACIÓN</p><h1>48 imágenes.<br/>Cero datos inventados.</h1><p>Integramos todo el material recibido para revisarlo. Estas imágenes todavía no representan productos publicados y no se pueden comprar.</p><div className="catalog-warning"><AlertTriangle/><span><strong>Revisión comercial pendiente.</strong> Faltan confirmar nombre, presentación, SKU, precio y stock de cada producto.</span></div></section><section className="shell provisional-section"><ProvisionalCatalog assets={PROVISIONAL_ASSETS}/></section></main></SiteShell>}
