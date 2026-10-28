import {beforeEach,describe,expect,it,vi} from "vitest";

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
});
