import Image from "next/image";
import Link from "next/link";
import {ArrowDownRight,ArrowRight,MessageCircle,PackageCheck,Snowflake,Truck} from "lucide-react";
import {ProductCard} from "./product-card";
import {PricedCatalog} from "./priced-catalog";
import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "@/lib/catalog-prices";
import {categoryCatalogHref,groupCatalogByType,storefrontSamples} from "@/lib/catalog-groups";
import {SiteShell} from "./site-shell";
export {SiteHeader as Header} from "./site-header";
export {SiteFooter as Footer} from "./site-footer";

import {whatsappHref} from "@/lib/whatsapp";
import {ars,type Banner,type Category,type Product,type Settings} from "@/lib/types";

const HERO_PRODUCTS=[
 {src:"/catalogo/img-20261023-wa0103.webp",alt:"Balde de helado Seitu de cinco litros"},
 {src:"/catalogo/seibom-dubai.webp",alt:"Palitos helados Seibom Dubai"},
 {src:"/catalogo/cono-tu-dl.webp",alt:"Cono helado de dulce de leche"},
] as const;

export function Storefront({settings,products,banners,demo,catalogItems=CATALOG_PRICE_ITEMS}:{settings:Settings;products:Product[];categories:Category[];banners:Banner[];demo:boolean;catalogItems?:CatalogPriceItem[]}){
 const featured=products.filter(product=>product.featured).slice(0,4);
 const visible=featured.length?featured:products.slice(0,4);
 const featuredCatalogItems=storefrontSamples(catalogItems,4);
 const catalogGroups=groupCatalogByType(catalogItems);
 const whatsapp=whatsappHref(settings.whatsapp);
 // Respetar textos personalizados en el admin; modernizar sólo el copy original de lanzamiento.
 const heroTitle=settings.hero_title==="Frío bien distribuido. Productos que llegan mejor."
  ?"Helados y congelados para tu negocio.":settings.hero_title;
 const heroSubtitle=settings.hero_subtitle==="Logística y distribución con entregas coordinadas por zona."
  ?"Palitos, postres y helados para tu comercio. Elegí lo que necesitás y coordinamos la entrega.":settings.hero_subtitle;
 return <SiteShell settings={settings}><main>
  <section className="hero-v2"><div className="hero-grid shell"><div className="hero-copy"><p className="kicker"><Snowflake/>DISTRIBUCIÓN DE HELADOS · ZONA SUR Y CABA</p><h1>{heroTitle}</h1><p className="hero-lead">{heroSubtitle}</p><div className="hero-cta"><Link className="primary-action" href="/catalogo">Ver productos y precios <ArrowRight/></Link><Link className="secondary-action" href="#como-comprar">Cómo comprar</Link></div></div><div className={`hero-visual ${settings.hero_image_url?"custom-hero":"product-composition"}`}>{settings.hero_image_url?<div className="hero-campaign-art"><Image src={settings.hero_image_url} alt="Promoción de helados y congelados disponibles en Viagelato" fill priority sizes="(max-width: 719px) calc(100vw - 32px), (max-width: 960px) 320px, 420px" unoptimized/></div>:<>{HERO_PRODUCTS.map((image,index)=><div className={`hero-product hero-product-${index+1}`} key={image.src}><Image src={image.src} alt={image.alt} fill priority={index===0} sizes="(max-width: 640px) 70vw, 30vw"/></div>)}</>}{!settings.hero_image_url?<div className="temperature-card"><small>VIAGELATO</small><strong>Helados para tu comercio.</strong><span>Distribución en Zona Sur y CABA</span></div>:null}</div></div><div className="shell hero-facts"><div><strong>Zona Sur y CABA</strong><span>Entregas coordinadas</span></div><div><strong>Desde {ars(settings.free_shipping_threshold)}</strong><span>Envío gratis en zonas habilitadas</span></div><div><strong>WhatsApp</strong><span>Pedí directamente</span></div></div></section>

  {banners.length>0?<section className="shell promo-grid">{banners.map(banner=><Link key={banner.id} href={banner.href||"/catalogo"} className="promo-card"><span className="promo-card-media" style={banner.image_url?{backgroundImage:`url(${banner.image_url})`}:undefined} aria-hidden="true"/><span className="promo-card-title">{banner.title}</span><p>{banner.subtitle}</p><ArrowDownRight/></Link>)}</section>:null}
  <section className="home-catalog shell refined-products" aria-label="Explorar productos por tipo" id="productos">
   <div className="section-title"><div><p className="kicker">ELEGÍ TUS PRODUCTOS</p><h2>Helados para tu negocio,<br/>listos para elegir.</h2></div><p>Elegí tus productos y agregalos al carrito.</p></div>
   <div className="home-selected-heading"><div><p className="kicker">DESTACADOS</p><h3>Elegí tus favoritos.</h3></div></div>
   {visible.length?<div className="home-featured-grid">{visible.map(product=><ProductCard product={product} key={product.id}/>)}</div>:<PricedCatalog items={featuredCatalogItems} compact/>}
   <div className="center-action"><Link className="primary-action" href="/catalogo">Ver {catalogItems.length} productos <ArrowRight size={18}/></Link></div>
   <div className="home-type-intro"><div><p className="kicker">COMPRÁ POR CATEGORÍA</p><h3>¿Qué tipo de helado buscás?</h3></div></div>
   <div className="home-type-grid">
    {catalogGroups.map(group=><Link href={categoryCatalogHref(group.name)} key={group.name} className="home-type-card">
     <span className="home-type-photo">{group.image?<Image src={group.image} alt="" fill sizes="(max-width:640px) 44vw, (max-width:960px) 30vw, 17vw" unoptimized/>:null}</span>
     <span className="home-type-info"><strong>{group.name}</strong><small>{group.count} presentaciones</small><ArrowRight size={18} aria-hidden="true"/></span>
    </Link>)}
   </div>
  </section>
  <section className="shell service-line refined-shopping-steps" id="como-comprar" aria-label="Cómo comprar en Viagelato"><article><PackageCheck/><div><h2>1. Elegí los productos</h2><p>Seleccioná las cajas o presentaciones que necesitás.</p></div></article><article><MessageCircle/><div><h2>2. Enviá tu pedido</h2><p>Revisá el carrito y envialo por WhatsApp.</p></div></article><article><Truck/><div><h2>3. Coordinamos la entrega</h2><p>Confirmamos disponibilidad, pago y envío.</p></div></article></section>
  <section className="brand-story"><div className="shell story-grid"><div className="story-number">V.</div><div><p className="kicker">VIAGELATO S.A.</p><h2>Logística que cuida lo que vendés.</h2><p>{settings.description}</p><Link className="text-link light-link" href="/nosotros">Conocé nuestra propuesta →</Link></div><div className="story-list"><span>01 <b>Alimentos congelados</b></span><span>02 <b>Zona sur de Buenos Aires</b></span><span>03 <b>Atención comercial directa</b></span></div></div></section>
  <section className="final-cta shell"><p className="kicker">¿TENÉS UNA CONSULTA?</p><h2>Hablemos de productos,<br/>zonas y entregas.</h2><div>{whatsapp?<a className="primary-action whatsapp-action" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle/> Consultar por WhatsApp <ArrowRight/></a>:<Link className="primary-action" href="/contacto"><MessageCircle/> Ver formas de contacto <ArrowRight/></Link>}<a className="secondary-action" href={`tel:${settings.phone.replace(/\D/g,"")}`}>{settings.phone}</a></div></section>
 </main></SiteShell>;
}
