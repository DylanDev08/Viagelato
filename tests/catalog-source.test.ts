import {describe,expect,it} from "vitest";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {catalogFromDatabase,type CatalogDbRow} from "@/lib/catalog-source-rules";

const original=CATALOG_PRICE_ITEMS[0];
const entry:CatalogDbRow={
 slug:"excel-fila-"+original.sourceRow,name:original.name,sku:original.sku,
 price:original.price,description:original.description,presentation:original.presentation,
 image_url:original.image,category_id:"c1",catalog_visible:true,
};

describe("catálogo con origen único de Supabase",()=>{
 it("usa precio, nombre, foto, presentación y categoría editados en el panel",()=>{
  const items=catalogFromDatabase([{
   ...entry,price:32199,name:"Presentación corregida",description:"Descripción desde el panel",
   presentation:"Caja de 12 unidades",image_url:"/catalogo/actualizada.webp"
  }],[{id:"c1",name:"Categoría actualizada"}]);
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
   sourceRow:original.sourceRow,id:original.id,sku:original.sku,
   price:32199,name:"Presentación corregida",description:"Descripción desde el panel",
   presentation:"Caja de 12 unidades",image:"/catalogo/actualizada.webp",
   category:"Categoría actualizada"
  });
 });
 it("no expone productos ocultos ni publicaciones inválidas",()=>{
  const items=catalogFromDatabase([
   {...entry,catalog_visible:false},
   {...entry,slug:"otra-ruta"},
   {...entry,price:0},
   {...entry,sku:""},
  ],[]);
  expect(items).toEqual([]);
 });
 it("no inventa fotografía ni stock cuando no están confirmados",()=>{
  const [item]=catalogFromDatabase([{...entry,image_url:null,price:7500}],[]);
  expect(item.image).toBeNull();
  expect(item.imageStatus).toBe("sin_foto");
  expect(item.price).toBe(7500);
  expect("stock" in item).toBe(false);
 });
});
