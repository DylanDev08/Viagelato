import {describe,expect,it} from "vitest";
import {clientAddress,isAllowedMutationOrigin,readLimitedJson} from "@/lib/request-security";

describe("seguridad de mutaciones públicas",()=>{
 it("exige Origin permitido y rechaza Fetch Metadata cross-site",()=>{
  const allowed=new Request("https://api.example/api/order",{method:"POST",headers:{origin:"https://shop.example"}});
  const absent=new Request("https://api.example/api/order",{method:"POST"});
  const crossSite=new Request("https://api.example/api/order",{method:"POST",headers:{origin:"https://shop.example","sec-fetch-site":"cross-site"}});
  expect(isAllowedMutationOrigin(allowed,"https://shop.example")).toBe(true);
  expect(isAllowedMutationOrigin(absent,"https://shop.example")).toBe(false);
  expect(isAllowedMutationOrigin(crossSite,"https://shop.example")).toBe(false);
 });
 it("no confía en un IP antepuesto por el cliente",()=>{
  const request=new Request("https://shop.example/api/order",{headers:{"x-forwarded-for":"198.51.100.8, 203.0.113.9"}});
  expect(clientAddress(request)).toBe("203.0.113.9");
 });
 it("prioriza X-Real-IP válido e ignora cabeceras malformadas",()=>{
  expect(clientAddress(new Request("https://shop.example",{headers:{"x-real-ip":"192.0.2.4","x-forwarded-for":"bad"}}))).toBe("192.0.2.4");
  expect(clientAddress(new Request("https://shop.example",{headers:{"x-real-ip":"not-an-ip","x-forwarded-for":"bad"}}))).toBe("unknown");
 });
 it("lee JSON válido y corta cuerpos sobredimensionados",async()=>{
  const valid=await readLimitedJson(new Request("https://shop.example",{method:"POST",headers:{"content-type":"application/json"},body:'{"ok":true}'}),32);
  const large=await readLimitedJson(new Request("https://shop.example",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({value:"x".repeat(100)})}),32);
  expect(valid).toEqual({ok:true,value:{ok:true}});
  expect(large).toEqual({ok:false,reason:"too-large"});
 });
});
