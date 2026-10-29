import Image from "next/image";
import Link from "next/link";
import {ArrowDownRight,ArrowRight,MapPin,MessageCircle,PackageCheck,Snowflake,Truck} from "lucide-react";
import {ProductCard} from "./product-card";
import {PricedCatalog} from "./priced-catalog";
import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "@/lib/catalog-prices";
import {categoryCatalogHref,groupCatalogByType,storefrontSamples} from "@/lib/catalog-groups";
import {SiteShell} from "./site-shell";
export {SiteHeader as Header} from "./site-header";
export {SiteFooter as Footer} from "./site-footer";

import {whatsappHref} from "@/lib/whatsapp";
import {ars,type Banner,type Category,type PublicProduct,type Settings} from "@/lib/types";

const HERO_PRODUCTS=[
 {src:"/catalogo/img-20261023-wa0103.webp",alt:"Balde de helado Seitu de cinco litros"},
 {src:"/catalogo/seibom-dubai.webp",alt:"Palitos helados Seibom Dubai"},
 {src:"/catalogo/cono-tu-dl.webp",alt:"Cono helado de dulce de leche"},
] as const;

export function Storefront({settings,products,banners,demo,catalogItems=CATALOG_PRICE_ITEMS}:{settings:Settings;products:PublicProduct[];categories:Category[];banners:Banner[];demo:boolean;catalogItems?:CatalogPriceItem[]}){
 const featured=products.filter(product=>product.featured).slice(0,4);
 const visible=featured.length?featured:products.slice(0,4);
 const pricedPreview=storefrontSamples(catalogItems,4);
 const catalogGroups=groupCatalogByType(catalogItems);
 const whatsapp=whatsappHref(settings.whatsapp);
 return <SiteShell settings={settings}><main>
  {demo?<div className="demo-strip">TIENDA EN PREPARACIÓN · Los pedidos permanecen deshabilitados hasta completar la configuración comercial.</div>:null}
  <section className="hero-v2"><div className="hero-grid shell"><div className="hero-copy"><p className="kicker"><Snowflake/>DISTRIBUCIÓN DE CONGELADOS</p><h1>{settings.hero_title}</h1><p className="hero-lead">{settings.hero_subtitle}</p><div className="hero-cta"><Link className="primary-action" href="/catalogo">Explorar catálogo <ArrowRight/></Link><Link className="secondary-action" href="/envios">Zonas de entrega</Link></div></div><div className={`hero-visual ${settings.hero_image_url?"custom-hero":"product-composition"}`}>{settings.hero_image_url?<Image src={settings.hero_image_url} alt="Productos distribuidos por Viagelato" fill priority sizes="(max-width: 960px) 100vw, 46vw" unoptimized/>:<>{HERO_PRODUCTS.map((image,index)=><div className={`hero-product hero-product-${index+1}`} key={image.src}><Image src={image.src} alt={image.alt} fill priority={index===0} sizes="(max-width: 640px) 70vw, 30vw"/></div>)}</>}<div className="temperature-card"><small>ZONA SUR</small><strong>Entrega coordinada.</strong><span>Consultá cobertura y disponibilidad</span></div></div></div><div className="shell hero-facts"><div><strong>Zona Sur</strong><span>Distribución en Buenos Aires</span></div><div><strong>{ars(settings.free_shipping_threshold)}</strong><span>Envío gratis en zonas elegibles</span></div><div><strong>Directa</strong><span>Atención comercial personalizada</span></div></div></section>
  <section className="shell service-line" aria-label="Propuesta de servicio"><article><Truck/><div><h2>Entrega coordinada</h2><p>Acordamos zona, día y franja de entrega.</p></div></article><article><PackageCheck/><div><h2>Productos seleccionados</h2><p>Helados y congelados para tu negocio.</p></div></article><article><MapPin/><div><h2>Atención directa</h2><p>Consultas comerciales por teléfono e Instagram.</p></div></article></section>
  {banners.length>0?<section className="shell promo-grid">{banners.map(banner=><Link key={banner.id} href={banner.href||"/catalogo"} className="promo-card" style={banner.image_url?{backgroundImage:`url(${banner.image_url})`}:undefined}><span>{banner.title}</span><p>{banner.subtitle}</p><ArrowDownRight/></Link>)}</section>:null}
  <section className="home-catalog shell" aria-label="Explorar productos por tipo">
   <div className="section-title"><div><p className="kicker">CATÁLOGO</p><h2>Encontrá lo que<br/>necesitás.</h2></div><p>Explorá cada tipo de producto. El catálogo completo está organizado en grupos para elegir más rápido.</p></div>
   <div className="home-type-grid">
    {catalogGroups.map(group=><Link href={categoryCatalogHref(group.name)} key={group.name} className="home-type-card">
     <span className="home-type-photo">{group.image?<Image src={group.image} alt="" fill sizes="(max-width:640px) 44vw, (max-width:960px) 30vw, 17vw" unoptimized/>:null}</span>
     <span className="home-type-info"><strong>{group.name}</strong><small>{group.count} presentaciones</small><ArrowRight size={18} aria-hidden="true"/></span>
    </Link>)}
   </div>
   <div className="home-selected-heading"><div><p className="kicker">EN LA TIENDA</p><h3>Elegí por presentación.</h3></div><p>Cuatro opciones para conocer nuestro catálogo. Explorá todas las variedades y consultá disponibilidad.</p></div>
   {visible.length?<div className="home-featured-grid">{visible.map(product=><ProductCard product={product} key={product.id}/>)}</div>:<PricedCatalog items={pricedPreview} compact/>}
   <div className="center-action"><Link className="primary-action" href="/catalogo">Ver todos los productos <ArrowRight size={18}/></Link></div>
  </section>
  <section className="brand-story"><div className="shell story-grid"><div className="story-number">V.</div><div><p className="kicker">VIAGELATO S.A.</p><h2>Logística que cuida lo que vendés.</h2><p>{settings.description}</p><Link className="text-link light-link" href="/nosotros">Conocé nuestra propuesta →</Link></div><div className="story-list"><span>01 <b>Alimentos congelados</b></span><span>02 <b>Zona sur de Buenos Aires</b></span><span>03 <b>Atención comercial directa</b></span></div></div></section>
  <section className="final-cta shell"><p className="kicker">¿TENÉS UNA CONSULTA?</p><h2>Hablemos de productos,<br/>zonas y entregas.</h2><div>{whatsapp?<a className="primary-action whatsapp-action" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle/> Consultar por WhatsApp <ArrowRight/></a>:<Link className="primary-action" href="/contacto"><MessageCircle/> Ver formas de contacto <ArrowRight/></Link>}<a className="secondary-action" href={`tel:${settings.phone.replace(/\D/g,"")}`}>{settings.phone}</a></div></section>
 </main></SiteShell>;
}
