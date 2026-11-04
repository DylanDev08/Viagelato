import {describe,expect,it} from "vitest";
import {additionalCatalogImages} from "@/lib/catalog-product-gallery";

describe("galería de imágenes del catálogo",()=>{
 it("sólo agrega imagen secundaria verificada de Carita",()=>{
  expect(additionalCatalogImages({sourceRow:10})).toEqual([
   {src:"/catalogo/carita-ch-v.webp",alt:"Helado Carita chocolate y vainilla"},
  ]);
  expect(additionalCatalogImages({sourceRow:15})).toEqual([]);
  expect(additionalCatalogImages({sourceRow:35})).toEqual([]);
  expect(additionalCatalogImages({sourceRow:46})).toEqual([]);
 });
});
