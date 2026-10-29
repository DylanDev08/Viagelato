import {render,screen,within} from "@testing-library/react";
import {describe,expect,it} from "vitest";
import {SiteFooter} from "@/components/site-footer";
import {Storefront} from "@/components/storefront";
import {CartProvider} from "@/components/cart";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("actualización visual y datos comerciales",()=>{
 it("no publica una dirección exacta cuando no está confirmada",()=>{
  render(<SiteFooter settings={DEFAULT_SETTINGS}/>);
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
  expect(within(section).getByRole("heading",{name:"Elegí por presentación."})).toBeInTheDocument();
  expect(within(section).getAllByRole("button",{name:/Agregar .* al carrito/})).toHaveLength(4);
  expect(within(section).queryByPlaceholderText("Buscar productos o sabores")).not.toBeInTheDocument();
 });
});
