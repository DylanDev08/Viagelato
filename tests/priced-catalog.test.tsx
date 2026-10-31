import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {CATALOG_PRICE_ITEMS,findCatalogPriceItem,findCatalogPriceItemByPath} from "@/lib/catalog-prices";
import {PricedCatalog} from "@/components/priced-catalog";
import {CartProvider} from "@/components/cart";

describe("precios del catálogo Viagelato de Excel",()=>{
 it("contiene exactamente las 45 filas de productos de la planilla, sin precios inventados",()=>{
  expect(CATALOG_PRICE_ITEMS).toHaveLength(45);
  expect(CATALOG_PRICE_ITEMS.map(item=>item.sourceRow)).toEqual(Array.from({length:45},(_,i)=>i+2));
  expect(new Set(CATALOG_PRICE_ITEMS.map(item=>item.id)).size).toBe(45);
  expect(CATALOG_PRICE_ITEMS.every(item=>Number.isInteger(item.price)&&item.price>0)).toBe(true);
  expect(CATALOG_PRICE_ITEMS.filter(item=>item.imageStatus==="coincidencia_exacta")).toHaveLength(43);
  expect(CATALOG_PRICE_ITEMS.filter(item=>item.imageStatus==="referencial")).toHaveLength(0);
  expect(CATALOG_PRICE_ITEMS.filter(item=>item.imageStatus==="sin_foto")).toHaveLength(2);
  expect(findCatalogPriceItem(1000)?.price).toBe(45900);
  expect(CATALOG_PRICE_ITEMS.find(item=>item.sourceRow===45)?.price).toBe(19900);
 });
 it("abre fichas reales y rechaza rutas inexistentes sin dejarlas en 404",()=>{
  expect(findCatalogPriceItemByPath("44")?.name).toBe("Palitos de agua: limón, frutilla y uva");
  expect(findCatalogPriceItemByPath("1000")?.price).toBe(45900);
  expect(findCatalogPriceItemByPath("0")).toBeNull();
  expect(findCatalogPriceItemByPath("abc")).toBeNull();
  expect(findCatalogPriceItemByPath("44extra")).toBeNull();
  expect(findCatalogPriceItemByPath("999999")).toBeNull();
 });
 it("muestra precios y permite agregar al carrito aunque el stock no esté confirmado",async()=>{
  const user=userEvent.setup();
  const sample=CATALOG_PRICE_ITEMS.slice(0,3);
  render(<CartProvider><PricedCatalog items={sample}/></CartProvider>);
  expect(screen.getByText("3 productos con precio por presentación")).toBeInTheDocument();
  expect(screen.getAllByText("PRECIO POR PRESENTACIÓN")).toHaveLength(3);
  await user.click(screen.getByRole("button",{name:`Agregar ${sample[0].name} al carrito`}));
  expect(screen.getByRole("link",{name:/En carrito: 1/})).toHaveAttribute("href","/carrito");
  await user.type(screen.getByPlaceholderText("Buscar productos o sabores"),"limon");
  expect(screen.getByText("1 producto con precio por presentación")).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/Ver ficha y precio de Palitos de agua/})).toHaveAttribute("href","/catalogo/vista/44");
 });
 it("muestra tarjetas comerciales breves conservando el acceso a los detalles",()=>{
  const item=CATALOG_PRICE_ITEMS[0];
  render(<CartProvider><PricedCatalog items={[item]}/></CartProvider>);
  expect(screen.getByRole("link",{name:`Ver ficha y precio de ${item.name}`})).toBeInTheDocument();
  expect(screen.getByText("Ver detalles del producto")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:`Agregar ${item.name} al carrito`})).toBeInTheDocument();
  expect(screen.queryByText(item.description)).not.toBeInTheDocument();
 });

});
