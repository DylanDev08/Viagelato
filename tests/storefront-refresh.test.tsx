import {readFileSync} from "node:fs";
import {render,screen,within} from "@testing-library/react";
import {describe,expect,it} from "vitest";
import {SiteFooter} from "@/components/site-footer";
import {Storefront} from "@/components/storefront";
import {CartProvider} from "@/components/cart";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("actualización visual y datos comerciales",()=>{
 it("no publica una dirección exacta cuando no está confirmada",()=>{
  render(<SiteFooter settings={{...DEFAULT_SETTINGS,address:"",maps_url:""}}/>);
  expect(screen.getByText(/Consultá nuestra ubicación exacta/i)).toBeInTheDocument();
  expect(screen.queryByRole("link",{name:/Cómo llegar/i})).not.toBeInTheDocument();
  expect(screen.getByRole("link",{name:"Cambios y devoluciones"})).toHaveAttribute("href","/politicas/devoluciones");
  expect(screen.getByRole("link",{name:"Botón de arrepentimiento"})).toHaveAttribute("href","/arrepentimiento");
 });
 it("muestra dirección exacta y enlace de Google Maps cuando el admin los completa",()=>{
  const settings={...DEFAULT_SETTINGS,address:"Av. Ejemplo 123, Lomas de Zamora, Buenos Aires",maps_url:"https://www.google.com/maps/place/Lomas+de+Zamora"};
  render(<SiteFooter settings={settings}/>);
  expect(screen.getByText(settings.address)).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/Cómo llegar/i})).toHaveAttribute("href",settings.maps_url);
 });
 it("evita un vínculo de mapa de dominio ajeno",()=>{
  render(<SiteFooter settings={{...DEFAULT_SETTINGS,address:"Av. Ejemplo 123, Buenos Aires",maps_url:"https://www.google.com.evil.example/maps"}}/>);
  expect(screen.queryByRole("link",{name:/Cómo llegar/i})).not.toBeInTheDocument();
 });
 it("home muestra solo cuatro artículos en su selección y sin filtros para catálogo completo",()=>{
  render(<CartProvider><Storefront settings={DEFAULT_SETTINGS} products={[]} categories={[]} banners={[]} demo={false}/></CartProvider>);
  const section=screen.getByRole("region",{name:"Explorar productos por tipo"});
  expect(within(section).getByRole("heading",{name:"Elegí tus favoritos."})).toBeInTheDocument();
  expect(within(section).getAllByRole("button",{name:/Agregar .* al carrito/})).toHaveLength(4);
  expect(section.querySelectorAll(".home-type-card")).toHaveLength(6);
  expect(within(section).queryByPlaceholderText("Buscar productos o sabores")).not.toBeInTheDocument();
 });
 it("prioriza productos y el recorrido de compra antes que el mensaje institucional",()=>{
  const {container}=render(<CartProvider><Storefront settings={{...DEFAULT_SETTINGS,hero_title:"Frío bien distribuido. Productos que llegan mejor.",hero_subtitle:"Logística y distribución con entregas coordinadas por zona."}} products={[]} categories={[]} banners={[]} demo={false}/></CartProvider>);
  expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Helados y congelados para tu negocio.");
  expect(screen.getByRole("link",{name:/Ver productos y precios/})).toHaveAttribute("href","/catalogo");
  expect(screen.getByRole("link",{name:"Cómo comprar"})).toHaveAttribute("href","#como-comprar");
  expect(screen.getByRole("region",{name:"Cómo comprar en Viagelato"})).toBeInTheDocument();
  const children=Array.from(container.querySelector("main")!.children);
  expect(children.findIndex(el=>el.classList.contains("home-catalog"))).toBeLessThan(children.findIndex(el=>el.classList.contains("brand-story")));
  expect(children.findIndex(el=>el.classList.contains("home-catalog"))).toBeLessThan(children.findIndex(el=>el.classList.contains("service-line")));
 });
 it("mantiene los textos de portada personalizados desde el panel",()=>{
  render(<CartProvider><Storefront settings={{...DEFAULT_SETTINGS,hero_title:"Productos seleccionados para tu comercio",hero_subtitle:"Una propuesta comercial personalizada."}} products={[]} categories={[]} banners={[]} demo={false}/></CartProvider>);
  expect(screen.getByRole("heading",{name:"Productos seleccionados para tu comercio"})).toBeInTheDocument();
  expect(screen.getByText("Una propuesta comercial personalizada.")).toBeInTheDocument();
 });

 it("integra una imagen promocional en una tarjeta responsive sin mostrar demo",()=>{
  const {container}=render(<CartProvider><Storefront settings={{...DEFAULT_SETTINGS,hero_image_url:"/catalogo/hero-seitu-tentate.webp"}} products={[]} categories={[]} banners={[]} demo={true}/></CartProvider>);
  const frame=container.querySelector(".hero-visual.custom-hero .hero-campaign-art");
  expect(frame).toBeInTheDocument();
  expect(frame?.querySelector("img")).toHaveAttribute("src","/catalogo/hero-seitu-tentate.webp");
  expect(container.querySelector(".temperature-card")).not.toBeInTheDocument();
  expect(screen.queryByText(/TIENDA EN PREPARACIÓN|DEMO|PREVIEW/i)).not.toBeInTheDocument();
 });
 it("carga al final el diseño específico de la campaña para no romper el responsive previo",()=>{
  const layout=readFileSync("src/app/layout.tsx","utf8");
  const css=readFileSync("src/app/hero-campaign.css","utf8");
  expect(layout.indexOf('import "./hero-campaign.css";')).toBeGreaterThan(layout.indexOf('import "./mobile-visual-polish.css";'));
  expect(css).toContain("aspect-ratio:900/1230");
  expect(css).toContain("@media(min-width:720px) and (max-width:960px)");
  expect(css).toContain("@media(max-width:719px)");
  expect(css).toContain("@media(max-width:380px)");
 });

});
