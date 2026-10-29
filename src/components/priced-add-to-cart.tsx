"use client";

import Link from "next/link";
import {ArrowRight,Check,Minus,Plus,ShoppingBag} from "lucide-react";
import {useState} from "react";
import {useCart} from "./cart";
import {catalogCartId} from "@/lib/whatsapp-cart";
import type {CatalogPriceItem} from "@/lib/catalog-prices";

/** Un mismo carrito para catálogo y ficha; WhatsApp se abre solo al finalizar el pedido. */
export function PricedAddToCart({item,detail=false}:{item:CatalogPriceItem;detail?:boolean}){
 const {add,items}=useCart();
 const [selected,setSelected]=useState(1);
 const [added,setAdded]=useState(false);
 const id=catalogCartId(item.sourceRow);
 const quantity=items.find(line=>line.id===id)?.quantity??0;
 const remaining=Math.max(0,99-quantity);
 const selectedQuantity=Math.min(selected,remaining);
 const full=remaining===0;
 function addProduct(){
  if(!selectedQuantity)return;
  add(id,selectedQuantity,99);
  setAdded(true);
  setSelected(1);
 }
 if(!detail)return <div className="priced-cart-action">
  <button type="button" className="priced-add-button" disabled={full} onClick={addProduct}
   aria-label={full?`Límite de 99 presentaciones de ${item.name}`:`Agregar ${item.name} al carrito`}>
   {full?"Límite alcanzado":added?"Agregar otro":"Agregar al carrito"}
  </button>
  {quantity>0?<Link href="/carrito" className="priced-cart-link">En carrito: {quantity} · Revisar pedido</Link>:<small>Elegí ahora · Confirmá stock al finalizar</small>}
 </div>;
 return <section className="detail-cart-purchase" aria-label="Agregar este producto al pedido">
  <p className="detail-cart-kicker"><ShoppingBag size={16} aria-hidden="true"/> ARMÁ TU PEDIDO</p>
  <div className="detail-cart-purchase-row">
   <div className="detail-cart-quantity" aria-label="Cantidad a agregar">
    <button type="button" onClick={()=>setSelected(value=>Math.max(1,value-1))} disabled={selectedQuantity<=1} aria-label="Restar cantidad"><Minus size={17}/></button>
    <output aria-live="polite">{selectedQuantity}</output>
    <button type="button" onClick={()=>setSelected(value=>Math.min(remaining,value+1))} disabled={selectedQuantity>=remaining} aria-label="Sumar cantidad"><Plus size={17}/></button>
   </div>
   <button type="button" className="primary-action detail-cart-add" disabled={full} onClick={addProduct} aria-label={full?`Límite de 99 presentaciones de ${item.name}`:`Agregar ${item.name} al carrito`}>
    {full?"Límite alcanzado":added?<><Check size={18}/> Agregado al carrito</>:<><ShoppingBag size={18}/> Agregar al carrito</>}
   </button>
  </div>
  {quantity>0?<Link href="/carrito" className="detail-cart-next"><strong>{quantity} {quantity===1?"presentación":"presentaciones"} en tu carrito</strong><span>Ver carrito y finalizar pedido <ArrowRight size={17}/></span></Link>:<p className="detail-cart-note">Agregá las presentaciones que quieras. Recién al finalizar el carrito se prepara el mensaje por WhatsApp.</p>}
 </section>;
}
