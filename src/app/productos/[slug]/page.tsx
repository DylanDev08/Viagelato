import {StructuredData} from "@/components/structured-data";
import {publicSiteUrl} from "@/lib/seo";
import {productData} from "@/lib/structured-data";
import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft,Box,PackageCheck,Snowflake,Truck} from "lucide-react";
import {ProductPurchase} from "@/components/product-purchase";
import {SiteShell} from "@/components/site-shell";
import {getProductBySlug} from "@/lib/site";
import {ars} from "@/lib/types";

export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;
 const {product}=await getProductBySlug(slug);
 if(!product)return {title:"Producto no encontrado",robots:{index:false,follow:false}};
 const base=publicSiteUrl();
 const indexable=process.env.ENABLE_INDEXING==="true"&&Boolean(base);
 const description=product.description?.trim()||`Consultá por ${product.name} en Viagelato. Agregalo al carrito y coordiná tu pedido por WhatsApp.`;
 const canonical=`/productos/${encodeURIComponent(product.slug)}`;
 let previewImage:string|undefined;
 if(product.image_url&&base){
  try{const url=new URL(product.image_url,base);if(url.protocol==="https:")previewImage=url.toString();}catch{}
 }
 return {
  title:product.name,description,
  robots:{index:indexable,follow:indexable},
  alternates:{canonical},
  openGraph:{type:"website",title:product.name,description,url:canonical,
   ...(previewImage?{images:[{url:previewImage,alt:product.name}]}:{})},
  twitter:{card:previewImage?"summary_large_image":"summary",title:product.name,description}
 };
}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {settings,product,categories,demo}=await getProductBySlug(slug);if(!product)notFound();const category=categories.find(item=>item.id===product.category_id);const base=publicSiteUrl();return <SiteShell settings={settings}>{base?<StructuredData data={productData(product,base)}/>:null}<main className="product-page shell"><Link className="back-link" href="/productos"><ArrowLeft/>Volver al catálogo</Link><div className="product-detail"><div className="detail-art">{product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="(max-width: 800px) 100vw, 50vw" unoptimized/>:<div className="product-placeholder large"><Box/><span>Imagen del producto a cargar</span></div>}{demo&&<span className="demo-pill">DEMO</span>}</div><div className="detail-copy"><p className="kicker">{category?.name??"PRODUCTO"}</p><h1>{product.name}</h1><section className="product-description-block" aria-label="Descripción del producto"><h2>Descripción del producto</h2><p className="detail-description">{product.description?.trim()||"Descripción comercial en actualización. Consultanos para conocer más."}</p></section>{product.presentation&&<p className="detail-meta"><span>Presentación</span><strong>{product.presentation}</strong></p>}{product.sku&&<p className="detail-meta"><span>Referencia</span><strong>{product.sku}</strong></p>}<p className="detail-price">{ars(Number(product.price))}</p><p className="availability">Disponibilidad a confirmar al finalizar el pedido</p><ProductPurchase product={product}/><p className="hint detail-purchase-disclaimer">Agregá este producto al carrito. Al finalizar, podrás enviar todos los artículos juntos por WhatsApp.</p></div></div><div className="detail-benefits"><div><Snowflake/><span><strong>Producto congelado</strong>Conservar según indicaciones del fabricante.</span></div><div><Truck/><span><strong>Entrega coordinada</strong>Confirmamos zona y día antes del despacho.</span></div><div><PackageCheck/><span><strong>Compra confirmada</strong>Stock y total se validan de forma manual.</span></div></div></main></SiteShell>}
