import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft,ImageOff} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {PricedAddToCart} from "@/components/priced-add-to-cart";
import {getStore} from "@/lib/site";
import {getPublicCatalog} from "@/lib/catalog-source";
import {ars} from "@/lib/types";
import {publicSiteUrl} from "@/lib/seo";
import {StructuredData} from "@/components/structured-data";
import {catalogProductData} from "@/lib/structured-data";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
async function lookup(raw:string){
 if(!/^[1-9][0-9]{0,5}$/.test(raw))return null;
 return (await getPublicCatalog()).find(item=>item.id===Number(raw))??null;
}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const item=await lookup((await params).id);
 if(!item)return {title:"Producto no encontrado",robots:{index:false,follow:false}};
 const base=publicSiteUrl();
 const indexable=process.env.ENABLE_INDEXING==="true"&&base!==null;
 return {title:item.name,description:item.description,robots:{index:indexable,follow:indexable},
  alternates:{canonical:`/catalogo/vista/${item.id}`},
  ...(item.image&&base?{openGraph:{images:[new URL(item.image,base).href]}}:{})};
}
export default async function ProductPage({params}:Props){
 const item=await lookup((await params).id);
 if(!item)notFound();
 const {settings}=await getStore();
 const base=publicSiteUrl();
 return <SiteShell settings={settings}>{base?<StructuredData data={catalogProductData(item,base)}/>:null}<main className="shell provisional-detail-page">
  <Link className="back-link" href="/catalogo"><ArrowLeft/> Volver al catálogo</Link>
  <div className="provisional-detail-grid">
   <div className="provisional-detail-image">
    {item.image?<Image src={item.image} alt={item.name} fill priority sizes="(max-width: 900px) 100vw,50vw" unoptimized/>:<div className="priced-detail-no-image"><ImageOff size={42} aria-hidden="true"/><p>Imagen no disponible</p></div>}
   </div>
   <div className="provisional-detail-copy">
    <p className="kicker">{item.category}</p><h1>{item.name}</h1>
    <div className="priced-detail-price"><small>PRECIO FINAL POR PRESENTACIÓN</small><strong>{ars(item.price)}</strong><span>{item.presentation}</span></div>
    <PricedAddToCart item={item} detail/>
    <p className="hint detail-purchase-disclaimer">Agregá productos al carrito y finalizá el pedido completo por WhatsApp. Antes de cerrar la compra confirmamos stock y entrega.</p>
    <section className="product-description-section" aria-label="Información del producto"><h2>Descripción del producto</h2><p>{item.description}</p>
    <div className="provisional-detail-facts"><div><span>Presentación</span><strong>{item.presentation}</strong></div><div><span>Disponibilidad</span><strong>Se confirma al realizar el pedido</strong></div></div></section>
   </div>
  </div>
 </main></SiteShell>;
}
