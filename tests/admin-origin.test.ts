import {afterEach,describe,expect,it,vi} from "vitest";
import {isAllowedAdminMutation} from "@/lib/admin-origin";

const site="https://viagelato.vercel.app";
const render="https://viagelato-api.onrender.com";
function request(origin:string|null,fetchSite:string|null="same-origin"){
 const headers=new Headers();
 if(origin!==null)headers.set("origin",origin);
 if(fetchSite!==null)headers.set("sec-fetch-site",fetchSite);
 return new Request(`${render}/api/admin/products`,{method:"PATCH",headers});
}
describe("origen de peticiones administrativas detrás de Vercel/Render",()=>{
 afterEach(()=>vi.unstubAllEnvs());
 it("acepta el origen público aunque Render reciba la petición internamente",()=>{
  expect(isAllowedAdminMutation(request(site),site)).toBe(true);
 });
 it("rechaza un sitio ajeno y Fetch Metadata cross-site",()=>{
  expect(isAllowedAdminMutation(request("https://untrusted.example"),site)).toBe(false);
  expect(isAllowedAdminMutation(request(site,"cross-site"),site)).toBe(false);
 });
 it("rechaza ausencia de Origin, origen inválido, otros esquemas y subdominios",()=>{
  expect(isAllowedAdminMutation(request(null),site)).toBe(false);
  expect(isAllowedAdminMutation(request("null"),site)).toBe(false);
  expect(isAllowedAdminMutation(request("not a url"),site)).toBe(false);
  expect(isAllowedAdminMutation(request("https://viagelato.vercel.app.evil.example"),site)).toBe(false);
  expect(isAllowedAdminMutation(request("http://viagelato.vercel.app"),site)).toBe(false);
 });
 it("admite una dirección preview solamente si está configurada explícitamente",()=>{
  const preview="https://viagelato-git-test.vercel.app";
  expect(isAllowedAdminMutation(request(preview),site)).toBe(false);
  expect(isAllowedAdminMutation(request(preview),site,preview)).toBe(true);
 });
 it("no confía en el Host de una URL construida por un proxy o atacante",()=>{
  const injected=new Request("https://atacante.example/api/admin/products",{
   method:"PATCH",headers:{origin:"https://atacante.example","sec-fetch-site":"same-origin"}
  });
  expect(isAllowedAdminMutation(injected,site,"")).toBe(false);
 });
 it("permite explícitamente Render directo y no cualquier subdominio parecido",()=>{
  expect(isAllowedAdminMutation(request(render),site,"")).toBe(true);
  expect(isAllowedAdminMutation(request("https://viagelato-api.onrender.com.evil.example"),site,"")).toBe(false);
 });
 it("no acepta localhost en un despliegue de producción",()=>{
  vi.stubEnv("NODE_ENV","production");
  const local=new Request("http://localhost:3000/api/admin/products",{
   method:"PATCH",headers:{origin:"http://localhost:3000"}
  });
  expect(isAllowedAdminMutation(local,site,"")).toBe(false);
 });
 it("acepta origen local durante desarrollo sin permitir un tercero",()=>{
  const local=new Request("http://localhost:3000/api/admin/products",{method:"POST",headers:{origin:"http://localhost:3000"}});
  expect(isAllowedAdminMutation(local,site)).toBe(true);
 });
});
