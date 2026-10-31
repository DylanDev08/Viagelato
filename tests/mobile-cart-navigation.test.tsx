import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {CartProvider,useCart} from "@/components/cart";
import {FloatingActions} from "@/components/floating-actions";
import {SiteHeader} from "@/components/site-header";
import {Checkout} from "@/components/checkout";
import {DEFAULT_SETTINGS} from "@/lib/types";

function CartItemFixture(){
 const {add}=useCart();
 return <button type="button" onClick={()=>add("catalog-price-2",1,99)}>Añadir producto de prueba</button>;
}
describe("navegación móvil del carrito",()=>{
 it("prioriza el carrito en el menú móvil sin mezclar el acceso administrativo",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><SiteHeader settings={DEFAULT_SETTINGS}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Abrir menú"}));
  const nav=screen.getByRole("navigation",{name:"Navegación mobile"});
  expect(nav).toHaveAttribute("aria-label","Navegación mobile");
  expect(screen.getByRole("link",{name:"Ver mi carrito"})).toHaveAttribute("href","/carrito");
  expect(screen.queryByRole("link",{name:"Acceso administración"})).not.toBeInTheDocument();
 });

 it("muestra una sola acción flotante de ancho completo al haber productos",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><CartItemFixture/><FloatingActions whatsapp={DEFAULT_SETTINGS.whatsapp}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Añadir producto de prueba"}));
  const quick=screen.getByRole("navigation",{name:"Accesos rápidos de compra"});
  expect(quick).toHaveClass("has-cart-items");
  expect(screen.getByRole("link",{name:"Ver carrito, 1 producto"})).toHaveAttribute("href","/carrito");
  expect(screen.queryByRole("link",{name:"Hablar con Viagelato por WhatsApp"})).not.toBeInTheDocument();
 });
 it("no coloca navegación flotante sobre el formulario del propio carrito",()=>{
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  expect(screen.queryByRole("navigation",{name:"Accesos rápidos de compra"})).not.toBeInTheDocument();
  expect(screen.getByRole("link",{name:"Carrito con 0 productos"})).toHaveAttribute("href","/carrito");
 });
});
