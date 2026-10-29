import {beforeEach,describe,expect,it,vi} from "vitest";
import {connected} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({connected:vi.fn(()=>false),privilegedDb:vi.fn()}));

describe("API de checkout en preproducción",()=>{
 beforeEach(()=>{process.env.ENABLE_CHECKOUT="false";});
 it("no crea pedidos cuando el checkout está deshabilitado",async()=>{
  const {POST}=await import("@/app/api/checkout/route");
  const response=await POST(new Request("http://localhost/api/checkout",{method:"POST",body:"{}"}));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error:"Los pedidos todavía no están habilitados"});
  expect(response.headers.get("cache-control")).toBe("no-store");
 });
 it("si se habilitara, rechaza una mutación sin Origin antes de usar la base",async()=>{
  process.env.ENABLE_CHECKOUT="true";
  process.env.CHECKOUT_RATE_LIMIT_SALT="test-only-salt";
  vi.mocked(connected).mockReturnValue(true);
  const {POST}=await import("@/app/api/checkout/route");
  const response=await POST(new Request("https://viagelato.vercel.app/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}));
  expect(response.status).toBe(403);
 });
});
