"use client";
import Link from "next/link";
import {MessageCircle,ShoppingBag} from "lucide-react";
import {useCart} from "./cart";
import {whatsappHref} from "@/lib/whatsapp";

export function FloatingActions({whatsapp}:{whatsapp:string}){
 const {count}=useCart();
 const href=whatsappHref(whatsapp);
 return <nav className={`floating-actions ${count>0?"has-cart-items":""}`} aria-label="Accesos rápidos de compra">
  {href&&count===0?<a className="float-contact float-whatsapp" href={href} target="_blank" rel="noopener noreferrer" aria-label="Hablar con Viagelato por WhatsApp"><MessageCircle aria-hidden="true"/><span>WhatsApp</span></a>:!href?<Link className="float-contact" href="/contacto" aria-label="Ir a los medios de contacto de Viagelato"><MessageCircle aria-hidden="true"/><span>Contacto</span></Link>:null}
  <Link className="float-cart" href="/carrito" aria-label={`Ver carrito, ${count} productos`}><ShoppingBag aria-hidden="true"/><span>{count>0?"Finalizar pedido":"Ver carrito"}</span><b>{count}</b></Link>
 </nav>;
}
