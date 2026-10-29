import {readFileSync} from "node:fs";
import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {CartProvider} from "@/components/cart";
import {SiteHeader} from "@/components/site-header";
import {FloatingActions} from "@/components/floating-actions";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("navegación mobile de Viagelato",()=>{
 it("abre el menú, habilita navegación por teclado y cierra con Escape",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><SiteHeader settings={DEFAULT_SETTINGS}/></CartProvider>);
  const toggle=screen.getByRole("button",{name:"Abrir menú"});
  const overlay=document.getElementById("mobile-navigation");
  expect(overlay).toHaveAttribute("aria-hidden","true");
  expect(within(overlay as HTMLElement).getByText("Catálogo")).toHaveAttribute("tabindex","-1");
  await user.click(toggle);
  expect(screen.getByRole("button",{name:"Cerrar menú"})).toHaveAttribute("aria-expanded","true");
  expect(overlay).toHaveAttribute("aria-hidden","false");
  expect(within(overlay as HTMLElement).getByRole("link",{name:"Catálogo"})).toHaveAttribute("tabindex","0");
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button",{name:"Abrir menú"})).toHaveAttribute("aria-expanded","false");
  expect(overlay).toHaveAttribute("aria-hidden","true");
 });
 it("cierra el menú al seleccionar un enlace",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><SiteHeader settings={DEFAULT_SETTINGS}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Abrir menú"}));
  const overlay=document.getElementById("mobile-navigation") as HTMLElement;
  await user.click(within(overlay).getByRole("link",{name:"Envíos"}));
  expect(overlay).toHaveAttribute("aria-hidden","true");
 });
 it("incluye WhatsApp y acceso a carrito en la barra inferior",()=>{
  render(<CartProvider><FloatingActions whatsapp="+5491140962202"/></CartProvider>);
  const nav=screen.getByRole("navigation",{name:"Accesos rápidos de compra"});
  expect(within(nav).getByRole("link",{name:"Hablar con Viagelato por WhatsApp"})).toHaveTextContent("WhatsApp");
  expect(within(nav).getByRole("link",{name:"Ver carrito, 0 productos"})).toHaveTextContent("Ver carrito");
  expect(within(nav).getByRole("link",{name:"Ver carrito, 0 productos"})).toHaveAttribute("href","/carrito");
 });
});

describe("puntos de adaptación responsiva",()=>{
 const css=readFileSync("src/app/mobile.css","utf8");
 const layout=readFileSync("src/app/layout.tsx","utf8");
 it("carga los estilos de mobile después de los estilos base",()=>{
  expect(layout.indexOf('import "./mobile.css";')).toBeGreaterThan(layout.indexOf('import "./storefront.css";'));
 });
 it("incluye tablets, teléfonos pequeños y safe areas",()=>{
  expect(css).toContain("@media (max-width: 960px)");
  expect(css).toContain("@media (max-width: 640px)");
  expect(css).toContain("@media (max-width: 420px)");
  expect(css).toContain("@media (max-width: 350px)");
  expect(css).toContain("env(safe-area-inset-bottom");
  expect(css).toContain(".checkout-page .qty button");
  expect(css).toContain(".admin-side nav");
 });
});
