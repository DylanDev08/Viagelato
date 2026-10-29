import type {Metadata} from "next";
import {PricedCatalog} from "@/components/priced-catalog";
import {ProductCard} from "@/components/product-card";
import {catalogHasSku} from "@/lib/catalog-publication";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";

import {SiteShell} from "@/components/site-shell";
import {getStore,getPublishedCatalog} from "@/lib/site";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Catálogo y precios",description:"Explorá las presentaciones de helados y congelados de Viagelato con precios finales por presentación y consulta de disponibilidad."};
export default async function CatalogPage({searchParams}:{searchParams:Promise<{tipo?:string}>}){
 const {tipo}=await searchParams;
 const [store,catalogItems]=await Promise.all([getStore(),getPublishedCatalog()]);
 const initialCategory=typeof tipo==="string"&&catalogItems.some(item=>item.category===tipo)?tipo:undefined;
 const {settings,products}=store;
 const newProducts=products.filter(product=>!catalogHasSku(CATALOG_PRICE_ITEMS,product.sku));
 return <SiteShell settings={settings}><main className="page-main">
  <section className="page-hero shell"><p className="kicker">CATÁLOGO VIAGELATO</p>
   <h1>Productos y<br/>presentaciones.</h1>
   <p>Elegí productos y cantidades, sumalos al carrito y envianos la solicitud por WhatsApp. Ahí confirmamos stock, entrega y transferencia.</p>
   <p className="prelaunch-note">El carrito no cobra ni reserva stock. La solicitud se confirma por WhatsApp.</p>
  </section>
  <section className="shell catalog-page">
   <p className="priced-catalog-source">Elegí un tipo de producto, compará las presentaciones y agregá lo que necesitás. Los precios son por caja o envase completo.</p>
   <PricedCatalog key={initialCategory??"all"} items={catalogItems} initialCategory={initialCategory}/>
   {newProducts.length?<section className="catalog-extra-products" aria-label="Otros productos publicados"><div className="catalog-type-heading"><h2>Otras novedades</h2><span>{newProducts.length} productos</span></div><div className="home-featured-grid">{newProducts.map(product=><ProductCard product={product} key={product.id}/>)}</div></section>:null}
  </section>
 </main></SiteShell>;
}
