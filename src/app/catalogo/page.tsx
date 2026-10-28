import type {Metadata} from "next";
import {PricedCatalog} from "@/components/priced-catalog";
import {CatalogBrowser} from "@/components/catalog-browser";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {CATALOG_PRICE_ITEMS,CATALOG_SOURCE_LABEL} from "@/lib/catalog-prices";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Catálogo y precios",description:"Explorá las presentaciones de helados y congelados de Viagelato con precios finales por presentación y consulta de disponibilidad."};
export default async function CatalogPage(){
 const {settings,products,categories,checkoutEnabled}=await getStore();
 // Hasta verificar stock y habilitar ventas, mostrar la planilla de precios sin permitir compras.
 const commercial=checkoutEnabled&&products.length>0;
 return <SiteShell settings={settings}><main className="page-main">
  <section className="page-hero shell"><p className="kicker">CATÁLOGO VIAGELATO</p>
   <h1>Productos y<br/>presentaciones.</h1>
   <p>{commercial?"Elegí los productos disponibles y consultá sus características.":"Conocé nuestros productos, sus variedades y los precios finales por presentación. La disponibilidad se confirma antes de coordinar la entrega."}</p>
   {!commercial&&<p className="prelaunch-note">Consulta comercial por WhatsApp. Los pedidos online todavía no están habilitados.</p>}
  </section>
  <section className="shell catalog-page">
   {commercial?<CatalogBrowser products={products} categories={categories}/>:<>
    <p className="priced-catalog-source">{CATALOG_SOURCE_LABEL} Los importes corresponden a cajas, envases o presentaciones completas, no a unidades sueltas.</p>
    <PricedCatalog items={CATALOG_PRICE_ITEMS}/>
   </>}
  </section>
 </main></SiteShell>;
}
