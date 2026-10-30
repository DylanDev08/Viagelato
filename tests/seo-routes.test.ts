import {afterEach,describe,expect,it,vi} from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import config from "../next.config";
import {getStore} from "@/lib/site";
import {PRIVATE_ROUTES,publicSiteUrl} from "@/lib/seo";
vi.mock("@/lib/site",()=>({getStore:vi.fn()}));
afterEach(()=>vi.unstubAllEnvs());
describe("SEO: aislamiento de rutas",()=>{
 it("bloquea indexación sin dominio HTTPS público válido",()=>{
  vi.stubEnv("ENABLE_INDEXING","true");
  for(const url of ["","http://localhost:3000","https://example.com/path","https://user:pass@example.com"]){
   vi.stubEnv("NEXT_PUBLIC_SITE_URL",url);
   expect(publicSiteUrl()).toBeNull();
   expect(robots()).toEqual({rules:[{userAgent:"*",disallow:"/"}]});
  }
 });
 it("excluye rutas privadas con robots y cabeceras noindex/no-store",async()=>{
  vi.stubEnv("ENABLE_INDEXING","true");vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://viagelato.example/");
  expect(robots()).toMatchObject({rules:[{disallow:PRIVATE_ROUTES}],sitemap:"https://viagelato.example/sitemap.xml"});
  const headers=await config.headers!();
  for(const route of PRIVATE_ROUTES)expect(headers).toContainEqual({source:`${route}/:path*`,headers:[
   {key:"X-Robots-Tag",value:"noindex, nofollow"},{key:"Cache-Control",value:"private, no-store"},
  ]});
 });
 it("no consulta la base ni publica sitemap antes del lanzamiento",async()=>{
  vi.stubEnv("ENABLE_INDEXING","false");
  expect(await sitemap()).toEqual([]);expect(getStore).not.toHaveBeenCalled();
 });
 it("genera URLs actuales sin redirección /productos ni rutas técnicas",async()=>{
  vi.stubEnv("ENABLE_INDEXING","true");vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://viagelato.example/");
  vi.mocked(getStore).mockResolvedValue({products:[{slug:"helado"}]} as Awaited<ReturnType<typeof getStore>>);
  const urls=(await sitemap()).map(row=>row.url);
  expect(urls).toContain("https://viagelato.example/productos/helado");
  expect(urls).not.toContain("https://viagelato.example/productos");
  expect(urls.every(url=>!url.includes("//productos"))).toBe(true);
 });
});
