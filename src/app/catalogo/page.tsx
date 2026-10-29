import type {Metadata} from "next";
import {PricedCatalog} from "@/components/priced-catalog";

import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {CATALOG_PRICE_ITEMS,CATALOG_SOURCE_LABEL} from "@/lib/catalog-prices";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Catálogo y precios",description:"Explorá las presentaciones de helados y congelados de Viagelato con precios finales por presentación y consulta de disponibilidad."};
export default async function CatalogPage(){
 const {settings}=await getStore();
 return <SiteShell settings={settings}><main className="page-main">
  <section className="page-hero shell"><p className="kicker">CATÁLOGO VIAGELATO</p>
   <h1>Productos y<br/>presentaciones.</h1>
   <p>Elegí productos y cantidades, sumalos al carrito y envianos la solicitud por WhatsApp. Ahí confirmamos stock, entrega y transferencia.</p>
   <p className="prelaunch-note">El carrito no cobra ni reserva stock. La solicitud se confirma por WhatsApp.</p>
  </section>
  <section className="shell catalog-page">
   <p className="priced-catalog-source">{CATALOG_SOURCE_LABEL} Los importes corresponden a cajas, envases o presentaciones completas, no a unidades sueltas.</p>
   <PricedCatalog items={CATALOG_PRICE_ITEMS}/>
  </section>
 </main></SiteShell>;
}
