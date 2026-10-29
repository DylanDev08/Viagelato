import type {PublicProduct} from "@/lib/types";

function absoluteUrl(value:string,base:string){
 try{return new URL(value,base).href;}catch{return null;}
}

export function ProductStructuredData({product,siteUrl}:{product:PublicProduct;siteUrl:string}){
 const url=absoluteUrl(`/productos/${encodeURIComponent(product.slug)}`,siteUrl);
 if(!url)return null;
 const image=product.image_url?absoluteUrl(product.image_url,siteUrl):null;
 const productData={
  "@context":"https://schema.org","@type":"Product",
  name:product.name,description:product.description,sku:product.sku||undefined,
  ...(image?{image:[image]}:{}),
  offers:{"@type":"Offer",url,priceCurrency:"ARS",price:Number(product.price)},
 };
 const breadcrumbs={
  "@context":"https://schema.org","@type":"BreadcrumbList",
  itemListElement:[
   {"@type":"ListItem",position:1,name:"Inicio",item:absoluteUrl("/",siteUrl)},
   {"@type":"ListItem",position:2,name:"Catálogo",item:absoluteUrl("/catalogo",siteUrl)},
   {"@type":"ListItem",position:3,name:product.name,item:url},
  ],
 };
 const safe=(value:unknown)=>JSON.stringify(value).replace(/</g,"\\u003c");
 return <>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safe(productData)}}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safe(breadcrumbs)}}/>
 </>;
}
