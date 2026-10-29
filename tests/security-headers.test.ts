import {describe,expect,it} from "vitest";
import nextConfig from "../next.config";

describe("cabeceras HTTP defensivas",()=>{
 it("impide MIME sniffing, iframes y permisos sensibles",async()=>{
  const definitions=await nextConfig.headers?.();
  const headers=new Map(definitions?.[0]?.headers.map(item=>[item.key,item.value]));
  expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(headers.get("X-Frame-Options")).toBe("DENY");
  expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  expect(headers.get("Permissions-Policy")).toContain("camera=()");
 });
});
