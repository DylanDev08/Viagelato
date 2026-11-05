import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const page=readFileSync("src/app/productos/[slug]/page.tsx","utf8");

describe("ficha de producto lista para futuro dominio y buscadores",()=>{
 it("utiliza una URL canónica por slug en la ficha",()=>{
  expect(page).toContain("alternates:{canonical}");
  expect(page).toContain("encodeURIComponent(product.slug)");
 });
 it("prepara imagen y vista previa de redes sin inventar recursos",()=>{
  expect(page).toContain("openGraph:");
  expect(page).toContain("previewImage");
  expect(page).toContain("twitter:");
  expect(page).toContain('url.protocol==="https:"');
 });
 it("no activa indexación prematuramente antes de conectar el dominio",()=>{
  expect(page).toContain('process.env.ENABLE_INDEXING==="true"');
  expect(page).toContain("robots:{index:indexable,follow:indexable}");
  expect(page).toContain("robots:{index:false,follow:false}");
 });
});
