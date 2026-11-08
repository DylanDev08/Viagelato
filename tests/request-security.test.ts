import {afterEach,describe,expect,it,vi} from "vitest";
import {rateLimitClientKey} from "@/lib/request-security";
afterEach(()=>vi.unstubAllEnvs());
describe("clave del limitador público",()=>{
 const salt="viagelato-test-dedicated-hmac-key-longer-than-32-chars";
 const req=(h:Record<string,string>)=>new Request("https://viagelato.vercel.app/api/whatsapp-request",{headers:h});
 it("ignora cabeceras de IP arbitrarias y usa solo la identidad del proxy en Vercel",()=>{
  vi.stubEnv("VERCEL","1");
  const first=rateLimitClientKey(req({"x-vercel-forwarded-for":"198.51.100.8","x-forwarded-for":"1.1.1.1","x-real-ip":"2.2.2.2"}),salt);
  const spoofed=rateLimitClientKey(req({"x-vercel-forwarded-for":"198.51.100.8","x-forwarded-for":"9.9.9.9","x-real-ip":"3.3.3.3"}),salt);
  const other=rateLimitClientKey(req({"x-vercel-forwarded-for":"198.51.100.9"}),salt);
  expect(spoofed).toBe(first);
  expect(other).not.toBe(first);
 });
 it("sin plataforma confiable, no toma IP falsificable como identidad",()=>{
  vi.stubEnv("VERCEL","");
  expect(rateLimitClientKey(req({"x-forwarded-for":"1.1.1.1"}),salt)).toBe(rateLimitClientKey(req({"x-forwarded-for":"2.2.2.2"}),salt));
 });
 it("omite direcciones inválidas y nunca devuelve la IP en claro",()=>{
  vi.stubEnv("VERCEL","1");
  const key=rateLimitClientKey(req({"x-vercel-forwarded-for":"spoofed"}),salt);
  expect(key).toMatch(/^[0-9a-f]{64}$/);
  expect(key).not.toContain("spoofed");
  expect(()=>rateLimitClientKey(req({}),"")).toThrow(/clave/);
  expect(()=>rateLimitClientKey(req({}),"too-short")).toThrow(/clave/);
 });
});
