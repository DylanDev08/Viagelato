"use client";

import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight,Box,Check,Plus} from "lucide-react";
import {useState} from "react";
import {useCart} from "./cart";
import {ars,type Product} from "@/lib/types";

export function ProductCard({product}:{product:Product}){
 const {add}=useCart();
 const [added,setAdded]=useState(false);
 function addProduct(){add(product.id);setAdded(true);window.setTimeout(()=>setAdded(false),1600);}
 return <article className="catalog-card">
  <Link className="catalog-art" href={`/productos/${product.slug}`} aria-label={`Ver ${product.name}`}>
   {product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw" unoptimized/>:<div className="product-placeholder"><Box/><span>Imagen a cargar</span></div>}
   {product.featured&&<span className="featured-label">DESTACADO</span>}
   <ArrowUpRight className="card-arrow"/>
  </Link>
  <div className="catalog-body">
   <p className={`availability ${product.stock>0?"available":"unavailable"}`}>{product.stock>0?"Disponible":"Sin stock"}</p>
   <Link href={`/productos/${product.slug}`}><h3>{product.name}</h3></Link>
   {product.presentation&&<p className="presentation">{product.presentation}</p>}
   <div className="catalog-buy"><strong>{ars(Number(product.price))}</strong><button type="button" className={added?"added":""} disabled={product.stock<=0} onClick={addProduct} aria-label={added?`${product.name} agregado al carrito`:`Agregar ${product.name} al carrito`}>{added?<Check/>:<Plus/>}</button></div><span className="sr-only" aria-live="polite">{added?`${product.name} agregado al carrito`:""}</span>
  </div>
 </article>;
}
