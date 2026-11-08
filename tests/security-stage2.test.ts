import {describe,expect,it} from "vitest";
import {readAdminJson} from "@/lib/admin-body";
import {securityHeaders} from "../next.config";
import {isAllowedAdminMutation} from "@/lib/admin-origin";

describe("protecciones HTTP para storefront y administrador",()=>{
 it("rechaza body enorme, incluso sin Content-Length",async()=>{
  const request=new Request("https://viagelato.vercel.app/api/admin/settings",{
   method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({notes:"x".repeat(65_000)})
  });
  request.headers.delete("content-length");
  const response=await readAdminJson(request);
  expect(response.ok).toBe(false);
  if(!response.ok)expect(response.response.status).toBe(413);
 });
 it("rechaza content-type distinto de application/json",async()=>{
  const request=new Request("https://viagelato.vercel.app/api/admin/settings",{
   method:"PUT",headers:{"Content-Type":"text/plain"},body:"{}"
  });
  const response=await readAdminJson(request);
  expect(response.ok).toBe(false);
  if(!response.ok)expect(response.response.status).toBe(415);
 });
 it("permite cuerpos JSON válidos",async()=>{
  const request=new Request("https://viagelato.vercel.app/api/admin/settings",{
   method:"PUT",headers:{"Content-Type":"application/json"},body:'{"name":"Viagelato"}'
  });
  expect(await readAdminJson(request)).toEqual({ok:true,data:{name:"Viagelato"}});
 });
 it("no confía en Host reflejado por un proxy",()=>{
  const attack=new Request("https://atacante.example/api/admin/settings",{
   method:"PUT",headers:{origin:"https://atacante.example","sec-fetch-site":"same-origin"}
  });
  expect(isAllowedAdminMutation(attack,"https://viagelato.vercel.app","")).toBe(false);
 });
 it("rechaza suplantación por subdominio",()=>{
  const attack=new Request("https://viagelato.vercel.app/api/admin/settings",{
   method:"PUT",headers:{origin:"https://viagelato.vercel.app.attacker.example"}
  });
  expect(isAllowedAdminMutation(attack,"https://viagelato.vercel.app","")).toBe(false);
 });
 it("aplica cabeceras defensivas globales sin CSP de scripts",()=>{
  const headers=new Map(securityHeaders.map(({key,value})=>[key,value]));
  expect(headers.get("X-Frame-Options")).toBe("DENY");
  expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(headers.get("Content-Security-Policy")).not.toContain("script-src");
  expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
 });
});
