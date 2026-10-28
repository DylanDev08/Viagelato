import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {CatalogBrowser} from "@/components/catalog-browser";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Productos publicados",description:"Productos con información comercial validada de Viagelato."};
export default async function ProductsPage(){const {settings,products,categories}=await getStore();return <SiteShell settings={settings}><main className="page-main"><section className="page-hero shell"><p className="kicker">PRODUCTOS PUBLICADOS</p><h1>Información completa<br/>antes de vender.</h1><p>Acá aparecen únicamente productos con nombre, SKU, precio y stock comercialmente validados.</p></section><section className="shell catalog-page">{products.length?<CatalogBrowser products={products} categories={categories}/>:<div className="safe-empty-state"><p className="kicker">CATÁLOGO COMERCIAL PENDIENTE</p><h2>Todavía no hay productos habilitados para comprar.</h2><p>Las 48 imágenes recibidas están integradas en una vista provisional, sin inventar precios ni disponibilidad.</p><Link className="primary-action" href="/catalogo">Revisar material provisional <ArrowRight/></Link></div>}</section></main></SiteShell>}
