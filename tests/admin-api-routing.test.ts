import {afterEach,describe,expect,it,vi} from "vitest";

afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});

async function rules(origin:string){
 vi.stubEnv("API_ORIGIN",origin);
 vi.resetModules();
 const config=(await import("../next.config")).default;
 const result=await config.rewrites?.();
 if(!result||Array.isArray(result))throw new Error("Se espera un objeto de reglas beforeFiles");
 return result;
}

describe("enrutamiento administrativo Vercel / Render",()=>{
 it("mantiene las API del panel en el mismo origen que la sesión",async()=>{
  const rewrites=await rules("https://viagelato-api.onrender.com");
  const sources=(rewrites.beforeFiles??[]).map(rule=>rule.source);
  expect(sources).not.toContain("/api/:path*");
  expect(sources.every(source=>!source.includes("/api/admin"))).toBe(true);
  expect(sources).toEqual(["/api/cron/:path*"]);
  expect(sources).not.toContain("/api/checkout");
 });
 it("deja checkout deshabilitable y health en Vercel, proxy solo para cron legado",async()=>{
  const rewrites=await rules("https://viagelato-api.onrender.com");
  expect(rewrites.beforeFiles).toEqual([
   {source:"/api/cron/:path*",destination:"https://viagelato-api.onrender.com/api/cron/:path*"},
  ]);
 });
 it("sirve todo localmente cuando no hay API_ORIGIN",async()=>{
  const rewrites=await rules("");
  expect(rewrites.beforeFiles).toEqual([]);
 });
 it("rechaza un API_ORIGIN inseguro",async()=>{
  vi.stubEnv("API_ORIGIN","http://backend.invalid");
  vi.resetModules();
  await expect(import("../next.config")).rejects.toThrow(/API_ORIGIN/);
 });
});
