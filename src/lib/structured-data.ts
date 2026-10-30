import type {Product,Settings} from "./types";

export function organizationData(settings:Settings,base:string){
 return {"@context":"https://schema.org","@type":"Organization",name:settings.name,url:base,
  description:settings.description,...(settings.contact_email?{email:settings.contact_email}:{})};
}

export function productData(product:Product,base:string){
 const url=`${base}/productos/${encodeURIComponent(product.slug)}`;
 const price=Number(product.price);
 return {"@context":"https://schema.org","@graph":[
  {"@type":"Product",name:product.name,description:product.description,url,
   ...(product.sku?{sku:product.sku}:{}),
   ...(product.image_url?{image:new URL(product.image_url,base).href}:{}),
   ...(product.active&&product.commercially_verified&&Number.isFinite(price)&&price>0
    ?{offers:{"@type":"Offer",price:price.toFixed(2),priceCurrency:"ARS",url}}:{}),
  },
  {"@type":"BreadcrumbList",itemListElement:[
   {"@type":"ListItem",position:1,name:"Inicio",item:base},
   {"@type":"ListItem",position:2,name:"Catálogo",item:`${base}/catalogo`},
   {"@type":"ListItem",position:3,name:product.name,item:url},
  ]},
 ]};
}
