"use client";

import Link from "next/link";
import {Check,Minus,Plus,ShoppingBag} from "lucide-react";
import {useState} from "react";
import {useCart} from "./cart";
import type {Product} from "@/lib/types";

export function ProductPurchase({product}:{product:Product}){
 const [quantity,setQuantity]=useState(1);
 const [added,setAdded]=useState(false);
 const {add,items}=useCart();
 const inCart=items.find(item=>item.id===product.id)?.quantity??0;
 const remaining=Math.max(0,Math.min(99,product.stock)-inCart);
 const selectedQuantity=remaining>0?Math.min(quantity,remaining):0;
 function addProduct(){if(selectedQuantity<=0)return;add(product.id,selectedQuantity,product.stock);setAdded(true);window.setTimeout(()=>setAdded(false),1800);}
 return <div className="purchase-block">
  <div className="purchase-row"><div className="purchase-qty"><button type="button" onClick={()=>setQuantity(Math.max(1,selectedQuantity-1))} disabled={selectedQuantity<=1} aria-label="Restar cantidad"><Minus/></button><span aria-live="polite">{selectedQuantity}</span><button type="button" onClick={()=>setQuantity(Math.min(remaining,selectedQuantity+1))} disabled={selectedQuantity>=remaining} aria-label="Sumar cantidad"><Plus/></button></div><button type="button" className="primary-action" disabled={remaining<=0} onClick={addProduct}>{remaining<=0?"Stock agregado al carrito":added?<><Check/>Agregado</>:<><ShoppingBag/>Agregar al carrito</>}</button></div>
  <Link className="text-link" href="/carrito">Ver carrito y condiciones de entrega →</Link>
 </div>;
}
