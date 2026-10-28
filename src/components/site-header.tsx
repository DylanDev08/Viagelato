"use client";

import Image from "next/image";
import Link from "next/link";
import {Menu,ShoppingBag,X} from "lucide-react";
import {useState} from "react";
import {useCart} from "./cart";
import type {Settings} from "@/lib/types";

const links=[
 {href:"/catalogo",label:"Catálogo"},
 {href:"/nosotros",label:"Nosotros"},
 {href:"/envios",label:"Envíos"},
 {href:"/contacto",label:"Contacto"},
];

export function SiteHeader({settings}:{settings:Settings}){
 const [open,setOpen]=useState(false);
 const {count}=useCart();
 // Archivo extraído del logo enviado por el cliente; sustituible desde el admin.
 const logo=settings.logo_url||"/viagelato-logo.png";
 return <header className="site-header">
  <div className="shell header-row">
   <Link className="site-brand" href="/" aria-label={`${settings.name}, inicio`} onClick={()=>setOpen(false)}>
    <Image src={logo} alt="Viagelato S.A. · Logística y distribución" width={126} height={68} style={{objectFit:"contain"}} unoptimized/>
   </Link>
   <nav className="desktop-nav" aria-label="Navegación principal">
    {links.map(link=><Link key={link.href} href={link.href}>{link.label}</Link>)}
   </nav>
   <div className="header-actions">
    <Link className="header-cart" href="/carrito" aria-label={`Carrito con ${count} productos`}><ShoppingBag size={19}/><span>Carrito</span><b>{count}</b></Link>
    <button className="menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?"Cerrar menú":"Abrir menú"} onClick={()=>setOpen(value=>!value)}>{open?<X/>:<Menu/>}</button>
   </div>
  </div>
  <div id="mobile-navigation" className={`mobile-nav ${open?"is-open":""}`}>
   <nav className="shell" aria-label="Navegación mobile">{links.map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)}>{link.label}</Link>)}</nav>
  </div>
 </header>;
}
