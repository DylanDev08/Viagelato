"use client";

import Link from "next/link";
import {Check,Minus,Plus,ShoppingBag} from "lucide-react";
import {useState} from "react";
import {useCart} from "./cart";
import type {Product} from "@/lib/types";

export function ProductPurchase({product}:{product:Product}){
 const [quantity,setQuantity]=useState(1);
 const [added,setAdded]=useState(false);
 const {add}=useCart();
 function addProduct(){add(product.id,quantity);setAdded(true);window.setTimeout(()=>setAdded(false),1800);}
 return <div className="purchase-block">
  <div className="purchase-row"><div className="purchase-qty"><button onClick={()=>setQuantity(value=>Math.max(1,value-1))} aria-label="Restar cantidad"><Minus/></button><span>{quantity}</span><button onClick={()=>setQuantity(value=>Math.min(product.stock,value+1))} disabled={quantity>=product.stock} aria-label="Sumar cantidad"><Plus/></button></div><button className="primary-action" disabled={product.stock<=0} onClick={addProduct}>{added?<><Check/>Agregado</>:<><ShoppingBag/>Agregar al carrito</>}</button></div>
  <Link className="text-link" href="/carrito">Ver carrito y condiciones de entrega →</Link>
 </div>;
}
