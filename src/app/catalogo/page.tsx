import type {Metadata} from "next";
import {PricedCatalog} from "@/components/priced-catalog";
import {ProductCard} from "@/components/product-card";

import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {getPublicCatalog} from "@/lib/catalog-source";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Catálogo y precios",description:"Explorá las presentaciones de helados y congelados de Viagelato con precios finales por presentación y consulta de disponibilidad.",alternates:{canonical:"/catalogo"}};
export default async function CatalogPage({searchParams}:{searchParams:Promise<{tipo?:string}>}){
 const {tipo}=await searchParams;
 const items=await getPublicCatalog();
 const initialCategory=typeof tipo==="string"&&items.some(item=>item.category===tipo)?tipo:undefined;
 const {settings,products}=await getStore();
 const skus=new Set(items.map(item=>item.sku));
 const verifiedProducts=products.filter(product=>!product.sku||!skus.has(product.sku));
 return <SiteShell settings={settings}><main className="page-main">
  <section className="page-hero shell"><p className="kicker">CATÁLOGO VIAGELATO</p>
   <h1>Elegí helados y congelados.</h1>
   <p>Encontrá tus productos, compará precios por caja o presentación y agregá todo a un solo carrito.</p>
   <p className="prelaunch-note">Confirmamos disponibilidad, entrega y pago por WhatsApp. No cobramos desde la web.</p>
  </section>
  <section className="shell catalog-page">
   <p className="priced-catalog-source">Buscá por nombre o sabor, filtrá por tipo de producto y agregá las presentaciones que necesitás.</p>
   {verifiedProducts.length>0?<section className="catalog-type-section" aria-label="Productos verificados"><div className="catalog-type-heading"><h2>Productos disponibles para consultar</h2><span>{verifiedProducts.length} {verifiedProducts.length===1?"producto":"productos"}</span></div><div className="home-featured-grid">{verifiedProducts.map(product=><ProductCard key={product.id} product={product}/>)}</div></section>:null}
   <PricedCatalog key={initialCategory??"all"} items={items} initialCategory={initialCategory}/>
  </section>
 </main></SiteShell>;
}
