import type {Metadata} from "next";
import {ProvisionalCatalog} from "@/components/provisional-catalog";
import {CatalogBrowser} from "@/components/catalog-browser";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {PROVISIONAL_PRODUCT_ASSETS} from "@/lib/provisional-catalog";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Catálogo",description:"Catálogo de helados y congelados distribuidos por Viagelato."};
export default async function CatalogPage(){const {settings,products,categories}=await getStore();const published=products.length>0;return <SiteShell settings={settings}><main className="page-main"><section className="page-hero shell"><p className="kicker">CATÁLOGO</p><h1>{published?<>Productos para<br/>tu negocio.</>:<>Muy pronto,<br/>nuestro catálogo.</>}</h1><p>{published?"Consultá presentaciones, precios y disponibilidad actual.":"Estamos validando presentaciones, precios y disponibilidad. Mientras tanto, podés conocer las líneas de productos que estamos preparando."}</p>{published?null:<p className="prelaunch-note">Tienda en preparación. Los pedidos todavía no están habilitados.</p>}</section><section className="shell catalog-page">{published?<CatalogBrowser products={products} categories={categories}/>:<ProvisionalCatalog assets={PROVISIONAL_PRODUCT_ASSETS}/>}</section></main></SiteShell>}
