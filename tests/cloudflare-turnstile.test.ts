import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {verifyTurnstile,turnstileEnabled} from "@/lib/turnstile";

vi.mock("server-only",()=>({}));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
beforeEach(()=>{vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES","viagelato.com.ar");});

describe("verificación Cloudflare Turnstile en servidor",()=>{
 it("no simula protección si faltan ambas credenciales",async()=>{
  vi.stubEnv("TURNSTILE_SECRET_KEY","");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","");
  expect(turnstileEnabled()).toBe(false);
  expect(await verifyTurnstile(undefined,"admin_login")).toEqual({ok:true});
 });
 it("falla cerrado si se configura solo una clave",async()=>{
  vi.stubEnv("TURNSTILE_SECRET_KEY","my-secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","");
  expect(await verifyTurnstile("token","admin_login")).toEqual({ok:false,reason:"configuration"});
 });
 it("exige token corto y no expone la clave en la petición pública",async()=>{
  vi.stubEnv("TURNSTILE_SECRET_KEY","private-secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","public-site-key");
  const fetcher=vi.fn(async()=>Response.json({success:true,action:"admin_login",hostname:"viagelato.vercel.app"}));
  vi.stubGlobal("fetch",fetcher);
  expect(await verifyTurnstile(undefined,"admin_login")).toEqual({ok:false,reason:"invalid"});
  expect(await verifyTurnstile("x".repeat(2049),"admin_login")).toEqual({ok:false,reason:"invalid"});
  expect(fetcher).not.toHaveBeenCalled();
  expect(await verifyTurnstile("valid-token","admin_login")).toEqual({ok:true});
  const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toContain("turnstile/v0/siteverify");
  expect(options.method).toBe("POST");
  expect(String(options.body)).toContain("private-secret");
  expect(options.cache).toBe("no-store");
 });
 it("rechaza dominios ajenos, acciones cambiadas y respuestas sin verificar",async()=>{
  vi.stubEnv("TURNSTILE_SECRET_KEY","private-secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","public-site-key");
  for(const data of [
   {success:true,hostname:"evil.example",action:"admin_login"},
   {success:true,hostname:"viagelato.vercel.app",action:"whatsapp_request"},
   {success:false,hostname:"viagelato.vercel.app",action:"admin_login"},
  ]){
   vi.stubGlobal("fetch",vi.fn(async()=>Response.json(data)));
   expect(await verifyTurnstile("new-one-use-token","admin_login")).toEqual({ok:false,reason:"invalid"});
  }
 });
 it("no acepta fallas de Cloudflare como una aprobación",async()=>{
  vi.stubEnv("TURNSTILE_SECRET_KEY","private-secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","public-site-key");
  vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("network down");}));
  expect(await verifyTurnstile("token","whatsapp_request")).toEqual({ok:false,reason:"unavailable"});
 });
});
