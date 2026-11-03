import type {CartLine,Product} from "./types";
import type {CatalogPriceItem} from "./catalog-prices";
import {catalogCartId} from "./whatsapp-cart";

export type CartDisplayItem={
 id:string;name:string;sku?:string|null;presentation?:string|null;
 price:number;image_url:string|null;stock:number|null;
};
export type CartViewLine={product:CartDisplayItem;quantity:number};

/**
 * Único adaptador de los productos públicos al carrito. Recibe información
 * servida desde Supabase; los importes solo son una vista previa y siempre
 * se recalculan en /api/whatsapp-request antes de crear una solicitud.
 */
export function resolveCartView(input:{
 items:CartLine[];
 products:Product[];
 catalogItems:CatalogPriceItem[];
}){
 const productsById=new Map<string,CartDisplayItem>();
 for(const p of input.products){
  productsById.set(p.id,{
   id:p.id,name:p.name,sku:p.sku,presentation:p.presentation,
   price:Number(p.price),image_url:p.image_url,stock:Number(p.stock)
  });
 }
 for(const p of input.catalogItems){
  const id=catalogCartId(p.sourceRow);
  productsById.set(id,{
   id,name:p.name,sku:p.sku,presentation:p.presentation,
   price:Number(p.price),image_url:p.image,stock:null
  });
 }
 const lines:CartViewLine[]=[];
 let missing=0,unavailable=false,totalCents=0,count=0;
 for(const item of input.items){
  const product=productsById.get(item.id);
  if(!product){missing++;continue;}
  const quantity=item.quantity;
  if(!Number.isInteger(quantity)||quantity<1||quantity>99||!Number.isFinite(product.price)||product.price<=0||
     (product.stock!==null&&(!Number.isInteger(product.stock)||quantity>product.stock)))unavailable=true;
  lines.push({product,quantity});
  totalCents+=Math.round(product.price*100)*quantity;
  count+=quantity;
 }
 return {lines,count,subtotal:totalCents/100,missing,unavailable,productsById};
}
