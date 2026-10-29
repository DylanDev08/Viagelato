import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {CartProvider} from "@/components/cart";
import {FloatingActions} from "@/components/floating-actions";
import {ProductCard} from "@/components/product-card";
import type {Product} from "@/lib/types";

const product:Product={id:"10000000-0000-4000-8000-000000000001",name:"Helado validado",slug:"helado-validado",description:"Producto real validado",price:12000,stock:4,image_url:null,category_id:null,active:true,sku:"REAL-1",presentation:"Caja",commercially_verified:true};

describe("interacciones de tienda",()=>{
 it("agrega un producto y comunica feedback accesible",async()=>{const user=userEvent.setup();render(<CartProvider><ProductCard product={product}/><FloatingActions whatsapp=""/></CartProvider>);await user.click(screen.getByRole("button",{name:"Agregar Helado validado al carrito"}));expect(screen.getByRole("button",{name:"Helado validado agregado al carrito"})).toBeInTheDocument();await waitFor(()=>expect(screen.getByRole("link",{name:"Ver carrito, 1 producto"})).toBeInTheDocument());});
 it("usa contacto cuando WhatsApp no está confirmado",()=>{render(<CartProvider><FloatingActions whatsapp=""/></CartProvider>);expect(screen.getByRole("link",{name:"Ir a los medios de contacto de Viagelato"})).toHaveAttribute("href","/contacto");});
 it("abre WhatsApp sólo cuando hay un número configurado",()=>{render(<CartProvider><FloatingActions whatsapp="+54 9 11 5555-0000"/></CartProvider>);expect(screen.getByRole("link",{name:"Hablar con Viagelato por WhatsApp"}).getAttribute("href")).toContain("https://wa.me/5491155550000?text=");});
});
