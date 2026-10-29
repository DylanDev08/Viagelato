"use client";
import Link from "next/link";
import {useCart} from "./cart";
import {catalogCartId} from "@/lib/whatsapp-cart";
import type {CatalogPriceItem} from "@/lib/catalog-prices";

export function PricedAddToCart({item}:{item:CatalogPriceItem}){
 const {add,items}=useCart();
 const id=catalogCartId(item.sourceRow);
 const quantity=items.find(line=>line.id===id)?.quantity??0;
 const full=quantity>=99;
 return <div className="priced-cart-action">
  <button type="button" className="priced-add-button" disabled={full}
   onClick={()=>add(id,1,99)}
   aria-label={full?`Límite de 99 presentaciones de ${item.name}`:`Agregar ${item.name} al carrito`}>
   {full?"Límite alcanzado":"Agregar al carrito"}
  </button>
  {quantity>0?<Link href="/carrito" className="priced-cart-link">En carrito: {quantity} · Revisar pedido</Link>:<small>Stock a confirmar por WhatsApp</small>}
 </div>;
}
