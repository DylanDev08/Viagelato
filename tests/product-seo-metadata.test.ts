import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("SEO: fichas de productos",()=>{
 const source=readFileSync("src/app/productos/[slug]/page.tsx","utf8");
 it("declara URL canónica por slug",()=>{
  expect(source).toContain("alternates:{canonical:url}");
  expect(source).toContain("encodeURIComponent(product.slug)");
 });
 it("publica metadatos para compartir sin inventar imágenes",()=>{
  expect(source).toContain("openGraph:{");
  expect(source).toContain("product.image_url?{images:");
  expect(source).toContain("twitter:{card:");
 });
 it("evita indexar fichas inexistentes",()=>{
  expect(source).toContain("robots:{index:false,follow:false}");
 });
});
