import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {CATALOG_PRICE_ITEMS,findCatalogPriceItem} from "@/lib/catalog-prices";
import {PricedCatalog} from "@/components/priced-catalog";

describe("precios del catálogo Viagelato de Excel",()=>{
 it("contiene exactamente las 45 filas de productos de la planilla, sin precios inventados",()=>{
  expect(CATALOG_PRICE_ITEMS).toHaveLength(45);
  expect(CATALOG_PRICE_ITEMS.map(item=>item.sourceRow)).toEqual(Array.from({length:45},(_,i)=>i+2));
  expect(new Set(CATALOG_PRICE_ITEMS.map(item=>item.id)).size).toBe(45);
  expect(CATALOG_PRICE_ITEMS.every(item=>Number.isInteger(item.price)&&item.price>0)).toBe(true);
  expect(CATALOG_PRICE_ITEMS.filter(item=>item.imageStatus==="coincidencia_exacta")).toHaveLength(43);
  expect(CATALOG_PRICE_ITEMS.filter(item=>item.imageStatus==="referencial")).toHaveLength(1);
  expect(CATALOG_PRICE_ITEMS.filter(item=>item.imageStatus==="sin_foto")).toHaveLength(1);
  expect(findCatalogPriceItem(1000)?.price).toBe(45900);
  expect(CATALOG_PRICE_ITEMS.find(item=>item.sourceRow===45)?.price).toBe(19900);
 });
 it("muestra importes finales por presentación, sin botones de compra cuando el stock no está confirmado",async()=>{
  const user=userEvent.setup();
  const sample=CATALOG_PRICE_ITEMS.slice(0,3);
  render(<PricedCatalog items={sample}/>);
  expect(screen.getByText("3 productos con precio por presentación")).toBeInTheDocument();
  expect(screen.getAllByText("PRECIO FINAL POR PRESENTACIÓN")).toHaveLength(3);
  expect(screen.queryByRole("button",{name:/agregar al carrito|comprar/i})).not.toBeInTheDocument();
  await user.type(screen.getByPlaceholderText("Buscar productos o sabores"),"limon");
  expect(screen.getByText("1 producto con precio por presentación")).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/Ver ficha y precio de Palitos de agua/})).toHaveAttribute("href","/catalogo/vista/44");
 });
});
