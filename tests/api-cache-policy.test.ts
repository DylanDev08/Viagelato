import {describe,expect,it} from "vitest";
import nextConfig from "../next.config";

describe("cache de endpoints sensibles",()=>{
 it("impide cachear las respuestas administrativas y los pedidos",async()=>{
  const headers=await nextConfig.headers?.();
  if(!headers)throw new Error("No hay configuración de headers");
  for(const route of ["/api/admin/:path*","/api/whatsapp-request","/api/checkout","/api/cron/:path*"]){
   const rule=headers.find(rule=>rule.source===route);
   expect(rule,route).toBeDefined();
   expect(rule?.headers.find(item=>item.key.toLowerCase()==="cache-control")?.value).toContain("no-store");
  }
 });
 it("conserva protecciones anti-framing y nosniff",async()=>{
  const headers=await nextConfig.headers?.();
  const defaults=headers?.find(rule=>rule.source==="/:path*")?.headers;
  expect(defaults?.some(item=>item.key==="X-Frame-Options"&&item.value==="DENY")).toBe(true);
  expect(defaults?.some(item=>item.key==="X-Content-Type-Options"&&item.value==="nosniff")).toBe(true);
 });
});
