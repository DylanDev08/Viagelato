import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft,ArrowUpRight,ImageOff,MessageCircle,PackageSearch} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {PricedAddToCart} from "@/components/priced-add-to-cart";
import {getStore} from "@/lib/site";
import {PROVISIONAL_PRODUCT_ASSETS} from "@/lib/provisional-catalog";
import {CATALOG_SOURCE_LABEL,findCatalogPriceItem} from "@/lib/catalog-prices";
import {ars} from "@/lib/types";
import {productWhatsappMessage,whatsappHref} from "@/lib/whatsapp";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
function lookup(raw:string){
 if(!/^[1-9]\d{0,5}$/.test(raw))return null;
 const id=Number(raw);
 return {priced:findCatalogPriceItem(id),asset:PROVISIONAL_PRODUCT_ASSETS.find(item=>item.id===id)??null};
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const found=lookup((await params).id);
 if(!found||(!found.priced&&!found.asset))return {title:"Producto no encontrado",robots:{index:false,follow:false}};
 const item=found.priced??found.asset!;
 return {title:`${item.name} | Viagelato`,description:found.priced?.description??`Consultá por ${item.name} en Viagelato.`,robots:{index:false,follow:false}};
}
export default async function ProductPreviewPage({params}:Props){
 const found=lookup((await params).id);
 if(!found||(!found.priced&&!found.asset))notFound();
 const item=found.priced??found.asset!;
 const priced=found.priced;
 const {settings}=await getStore();
 const whatsapp=whatsappHref(settings.whatsapp,productWhatsappMessage(priced?`${priced.name} (${priced.presentation}) — ${ars(priced.price)}`:item.name));
 return <SiteShell settings={settings}><main className="shell provisional-detail-page">
  <Link className="back-link" href="/catalogo"><ArrowLeft/> Volver al catálogo</Link>
  <div className="provisional-detail-grid">
   <div className="provisional-detail-image">
    {item.image?<Image src={item.image} alt={item.name} fill priority sizes="(max-width: 900px) 100vw,50vw"/>:<div className="priced-detail-no-image"><ImageOff size={42} aria-hidden="true"/><p>Fotografía pendiente</p></div>}
   </div>
   <div className="provisional-detail-copy">
    <p className="kicker">{item.category}</p><h1>{item.name}</h1>
    <span className="detail-review-label"><PackageSearch size={17} aria-hidden="true"/> {priced?"Precio por presentación · Stock a confirmar":"Ficha informativa en preparación"}</span>
    {priced?<><div className="priced-detail-price"><small>PRECIO FINAL POR PRESENTACIÓN</small><strong>{ars(priced.price)}</strong><span>{priced.presentation}</span></div>
      <h2>Descripción del producto</h2><p>{priced.description}</p>
      {priced.imageStatus==="referencial"&&<p className="priced-reference-note">La fotografía es una imagen general de referencia aportada junto con la planilla. Confirmá la presentación antes de comprar.</p>}
      <div className="provisional-detail-facts"><div><span>Presentación</span><strong>{priced.presentation}</strong></div><div><span>Disponibilidad</span><strong>Consultar por WhatsApp</strong></div></div>
      <p className="hint">{CATALOG_SOURCE_LABEL}</p>
     </>:<><h2>Acerca de este producto</h2><p>Esta imagen pertenece al catálogo preliminar de Viagelato. Su precio y presentación no figuran asociados en la última planilla.</p>
      <div className="provisional-detail-facts"><div><span>Categoría orientativa</span><strong>{item.category}</strong></div><div><span>Precio y stock</span><strong>A confirmar</strong></div></div></>}
    {priced?<PricedAddToCart item={priced}/>:null}
    {whatsapp?<a className="primary-action whatsapp-action" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle/> Consultar por WhatsApp <ArrowUpRight/></a>:
     <Link className="primary-action" href="/contacto"><MessageCircle/> Consultar disponibilidad <ArrowUpRight/></Link>}
    <p className="hint">Esta consulta no genera automáticamente un pedido ni reserva mercadería.</p>
   </div>
  </div>
 </main></SiteShell>;
}
