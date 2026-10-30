import {describe,expect,it} from "vitest";
import {readAdminJson,readAdminUpload} from "@/lib/admin-body";
import {securityHeaders} from "../next.config";

describe("capa de seguridad de rutas y contenido administrativo",()=>{
 it("rechaza JSON enorme aunque no venga Content-Length",async()=>{
  const input=new Request("https://viagelato.vercel.app/api/admin/products",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({notes:"x".repeat(65_000)})
  });
  input.headers.delete("content-length");
  const parsed=await readAdminJson(input);
  expect(parsed.ok).toBe(false);
  if(!parsed.ok)expect(parsed.response.status).toBe(413);
 });
 it("rechaza un tipo de contenido diferente de JSON",async()=>{
  const input=new Request("https://viagelato.vercel.app/api/admin/products",{
   method:"POST",headers:{"Content-Type":"text/plain"},body:"{}"
  });
  const parsed=await readAdminJson(input);
  expect(parsed.ok).toBe(false);
  if(!parsed.ok)expect(parsed.response.status).toBe(415);
 });
 it("conserva las solicitudes pequeñas del administrador",async()=>{
  const input=new Request("https://viagelato.vercel.app/api/admin/products",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({name:"Helado"})
  });
  const parsed=await readAdminJson(input);
  expect(parsed).toEqual({ok:true,data:{name:"Helado"}});
 });
 it("rechaza multipart anunciado mayor al límite antes de convertirlo a FormData",async()=>{
  const input=new Request("https://viagelato.vercel.app/api/admin/upload",{
   method:"POST",headers:{"Content-Type":"multipart/form-data; boundary=XYZ123","Content-Length":"99000000"},
   body:"x"
  });
  const parsed=await readAdminUpload(input);
  expect(parsed.ok).toBe(false);
  if(!parsed.ok)expect(parsed.response.status).toBe(413);
 });
 it("rechaza multipart chunked demasiado grande",async()=>{
  const input=new Request("https://viagelato.vercel.app/api/admin/upload",{
   method:"POST",headers:{"Content-Type":"multipart/form-data; boundary=XYZ123"},
   body:"x".repeat(3_100_001)
  });
  input.headers.delete("content-length");
  const parsed=await readAdminUpload(input);
  expect(parsed.ok).toBe(false);
  if(!parsed.ok)expect(parsed.response.status).toBe(413);
 });
 it("entrega cabeceras anti-clickjacking, no-sniff y CSP mínima",()=>{
  const headers=new Map(securityHeaders.map(({key,value})=>[key,value]));
  expect(headers.get("X-Frame-Options")).toBe("DENY");
  expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
 });
});
