"use client";

import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight,Box,Check,Plus} from "lucide-react";
import {useState} from "react";
import {useCart} from "./cart";
import {ars,type PublicProduct} from "@/lib/types";

export function ProductCard({product}:{product:PublicProduct}){
 const {add,items}=useCart();
 const inCart=items.find(item=>item.id===product.id)?.quantity??0;
 const remaining=Math.max(0,99-inCart);
 const [added,setAdded]=useState(false);
 function addProduct(){if(remaining<=0)return;add(product.id,1,99);setAdded(true);window.setTimeout(()=>setAdded(false),1600);}
 return <article className="catalog-card">
  <Link className="catalog-art" href={`/productos/${product.slug}`} aria-label={`Ver ${product.name}`}>
   {product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw" unoptimized/>:<div className="product-placeholder"><Box/><span>Imagen a cargar</span></div>}
   {product.featured&&<span className="featured-label">DESTACADO</span>}
   <ArrowUpRight className="card-arrow"/>
  </Link>
  <div className="catalog-body">
   <p className="availability">Stock a confirmar por WhatsApp</p>
   <Link href={`/productos/${product.slug}`}><h3>{product.name}</h3></Link>
   {product.presentation&&<p className="presentation">{product.presentation}</p>}
   {product.description?.trim()&&<p className="catalog-description">{product.description}</p>}
   <Link className="catalog-view-detail" href={`/productos/${product.slug}`}>Ver descripción y detalles <ArrowUpRight size={16}/></Link>
   <div className="catalog-buy"><strong>{ars(Number(product.price))}</strong><button type="button" className={added?"added":""} disabled={remaining<=0} onClick={addProduct} aria-label={remaining<=0?`Se alcanzó el stock disponible de ${product.name}`:added?`${product.name} agregado al carrito`:`Agregar ${product.name} al carrito`}>{added?<Check/>:<Plus/>}</button></div><span className="sr-only" aria-live="polite">{added?`${product.name} agregado al carrito`:""}</span>
  </div>
 </article>;
}
