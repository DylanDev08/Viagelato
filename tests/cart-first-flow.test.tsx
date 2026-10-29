import {readFileSync} from "node:fs";
import {render,screen,waitFor,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {CartProvider} from "@/components/cart";
import {PricedAddToCart} from "@/components/priced-add-to-cart";
import {FloatingActions} from "@/components/floating-actions";
import {SiteFooter} from "@/components/site-footer";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("flujo Viagelato: producto → carrito → pedido por WhatsApp",()=>{
 it("permite seleccionar varias presentaciones desde la ficha y mantiene el carrito como siguiente paso",async()=>{
  const user=userEvent.setup();
  const product=CATALOG_PRICE_ITEMS[0];
  render(<CartProvider><PricedAddToCart item={product} detail/><FloatingActions whatsapp={DEFAULT_SETTINGS.whatsapp}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Sumar cantidad"}));
  await user.click(screen.getByRole("button",{name:"Sumar cantidad"}));
  await user.click(screen.getByRole("button",{name:`Agregar ${product.name} al carrito`}));
  expect(screen.getByText("3 presentaciones en tu carrito")).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/3 presentaciones en tu carrito/})).toHaveAttribute("href","/carrito");
  await waitFor(()=>expect(screen.getByRole("link",{name:"Ver carrito, 3 productos"})).toHaveTextContent("Finalizar pedido"));
  const shortcuts=screen.getByRole("navigation",{name:"Accesos rápidos de compra"});
  expect(within(shortcuts).queryByRole("link",{name:"Hablar con Viagelato por WhatsApp"})).not.toBeInTheDocument();
 });
 it("mantiene el botón de agregar en el catálogo sin abrir WhatsApp",async()=>{
  const user=userEvent.setup();
  const product=CATALOG_PRICE_ITEMS[1];
  render(<CartProvider><PricedAddToCart item={product}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:`Agregar ${product.name} al carrito`}));
  expect(screen.getByRole("link",{name:/En carrito: 1/})).toHaveAttribute("href","/carrito");
 });
 it("elimina los CTAs directos a WhatsApp de ambas páginas de producto",()=>{
  const priced=readFileSync("src/app/catalogo/vista/[id]/page.tsx","utf8");
  const published=readFileSync("src/app/productos/[slug]/page.tsx","utf8");
  expect(priced).toContain("<PricedAddToCart item={item} detail/>");
  expect(priced).not.toContain("Consultar por WhatsApp <");
  expect(published).not.toContain("product-whatsapp-link");
  expect(readFileSync("src/components/checkout.tsx","utf8")).toContain('fetch("/api/whatsapp-request"');
 });
 it("muestra la dirección confirmada en footer sin referenciar la altura alternativa",()=>{
  render(<SiteFooter settings={DEFAULT_SETTINGS}/>);
  expect(DEFAULT_SETTINGS.address).toContain("Eva Perón 3050");
  expect(DEFAULT_SETTINGS.address).not.toContain("3042");
  expect(screen.getByText(DEFAULT_SETTINGS.address)).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/Cómo llegar/i}).getAttribute("href")).toContain("google.com/maps");
 });
});
