"use client";

import Link from "next/link";
import {MessageCircle,ShoppingBag} from "lucide-react";
import {useCart} from "./cart";

export function FloatingActions({whatsapp}:{whatsapp:string}){
 const {count}=useCart();
 const contact=whatsapp?`https://wa.me/${whatsapp.replace(/\D/g,"")}`:"/contacto";
 return <div className="floating-actions">
  <a className="float-contact" href={contact} target={whatsapp?"_blank":undefined} rel={whatsapp?"noreferrer":undefined} aria-label={whatsapp?"Consultar por WhatsApp":"Ir a contacto"}><MessageCircle/><span>Consultar</span></a>
  <Link className="float-cart" href="/carrito" aria-label={`Ver carrito, ${count} productos`}><ShoppingBag/><b>{count}</b></Link>
 </div>;
}
