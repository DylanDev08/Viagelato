import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft,ArrowUpRight,MessageCircle,PackageSearch} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {getStore} from "@/lib/site";
import {PROVISIONAL_PRODUCT_ASSETS} from "@/lib/provisional-catalog";
import {productWhatsappMessage,whatsappHref} from "@/lib/whatsapp";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
const findAsset=(raw:string)=>{
 if(!/^[1-9]\d{0,5}$/.test(raw))return null;
 return PROVISIONAL_PRODUCT_ASSETS.find(asset=>asset.id===Number(raw))??null;
};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const asset=findAsset((await params).id);
 return asset?{title:`${asset.name} | Catálogo en preparación`,description:`Conocé la imagen y categoría provisionales de ${asset.name}. Confirmá los datos comerciales con Viagelato.`,robots:{index:false,follow:false}}:{title:"Producto no encontrado",robots:{index:false,follow:false}};
}
export default async function ProvisionalProductDetail({params}:Props){
 const asset=findAsset((await params).id);
 if(!asset)notFound();
 const {settings}=await getStore();
 const whatsapp=whatsappHref(settings.whatsapp,productWhatsappMessage(asset.name));
 return <SiteShell settings={settings}><main className="shell provisional-detail-page">
  <Link className="back-link" href="/catalogo"><ArrowLeft/> Volver al catálogo</Link>
  <div className="provisional-detail-grid">
   <div className="provisional-detail-image"><Image src={asset.image} alt={asset.name} fill priority sizes="(max-width: 900px) 100vw, 50vw"/></div>
   <div className="provisional-detail-copy">
    <p className="kicker">{asset.category}</p>
    <h1>{asset.name}</h1>
    <span className="detail-review-label"><PackageSearch size={17} aria-hidden="true"/> Ficha informativa en preparación</span>
    <h2>Acerca de este producto</h2>
    <p>Esta imagen forma parte del catálogo que Viagelato está preparando. El nombre y la categoría son provisionales y están sujetos a confirmación con el proveedor.</p>
    <p>Estamos verificando la descripción comercial, la presentación, el precio y la disponibilidad antes de habilitar ventas.</p>
    <div className="provisional-detail-facts"><div><span>Categoría orientativa</span><strong>{asset.category}</strong></div><div><span>Precio y stock</span><strong>A confirmar</strong></div></div>
    {whatsapp?<a className="primary-action whatsapp-action" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle/> Consultar este producto <ArrowUpRight/></a>:
     <Link className="primary-action" href="/contacto"><MessageCircle/> Consultar disponibilidad <ArrowUpRight/></Link>}
    <p className="hint">La consulta no genera una compra ni reserva mercadería.</p>
   </div>
  </div>
 </main></SiteShell>;
}
