import {readFileSync} from "node:fs";
import {render} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {OrganizationStructuredData} from "@/components/organization-structured-data";
import {ProductStructuredData} from "@/components/product-structured-data";
import {DEFAULT_SETTINGS} from "@/lib/types";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {privatePageMetadata} from "@/lib/seo";

vi.mock("@/lib/site",()=>({getStore:vi.fn(async()=>({products:[]}))}));

describe("SEO seguro antes del lanzamiento",()=>{
 afterEach(()=>vi.unstubAllEnvs());
 it("no publica sitemap mientras la indexación está deshabilitada",async()=>{
  vi.stubEnv("ENABLE_INDEXING","false");
  expect(await sitemap()).toEqual([]);
  expect(robots().rules).toEqual([{userAgent:"*",disallow:"/"}]);
 });
 it("excluye rutas privadas cuando se habilite la indexación",()=>{
  vi.stubEnv("ENABLE_INDEXING","true");
  const result=robots();
  expect(JSON.stringify(result)).toContain("/admin");
  expect(JSON.stringify(result)).toContain("/actualizar-contrasena");
  expect(JSON.stringify(result)).toContain("/carrito");
  expect(privatePageMetadata("Privada").robots).toMatchObject({index:false,follow:false,nocache:true});
 });
 it("serializa Organization sin permitir cerrar el script",()=>{
  const settings={...DEFAULT_SETTINGS,name:"Viagelato </script><script>alert(1)</script>"};
  const {container}=render(<OrganizationStructuredData settings={settings}/>);
  const source=container.querySelector("script")?.innerHTML??"";
  expect(source).toContain("Viagelato \\u003c/script>");
  expect(source).not.toContain("</script><script>");
 });
 it("publica Product, Offer y breadcrumbs sin inventar reseñas ni disponibilidad",()=>{
  const product={id:"p1",name:"Helado de limón",slug:"helado-limon",description:"Presentación comercial verificada.",price:12500,image_url:"/catalogo/limon.webp",category_id:null,active:true,sku:"VIA-1"};
  const {container}=render(<ProductStructuredData product={product} siteUrl="https://viagelato.example"/>);
  const source=container.textContent??"";
  expect(source).toContain('"@type":"Product"');
  expect(source).toContain('"@type":"Offer"');
  expect(source).toContain('"priceCurrency":"ARS"');
  expect(source).toContain('"@type":"BreadcrumbList"');
  expect(source).not.toMatch(/review|aggregateRating|availability/);
 });
 it("mantiene el stock fuera de la consulta pública y lo restringe por migración",()=>{
  const source=readFileSync("src/lib/site.ts","utf8");
  const migration=readFileSync("supabase/migrations/20261029212638_harden_public_api_and_product_columns.sql","utf8");
  expect(source).toContain("PUBLIC_PRODUCT_COLUMNS");
  expect(source).not.toContain('from("products").select("*")');
  expect(migration).toContain("revoke select on table public.products from anon, authenticated");
  const granted=migration.match(/grant select \(([\s\S]*?)\) on table public\.products/i)?.[1]??"";
  expect(granted).not.toContain("stock");
 });
});
