import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/checkout/route";
import {privilegedDb} from "@/lib/supabase";
vi.mock("@/lib/supabase",()=>({connected:()=>true,privilegedDb:vi.fn()}));
const request=(headers:Record<string,string>={},body="{}")=>new Request("https://viagelato.vercel.app/api/checkout",{
 method:"POST",headers:{Origin:"https://viagelato.vercel.app","Content-Type":"application/json","Idempotency-Key":"22222222-3333-4444-8555-666666666666",...headers},body,
});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("ENABLE_CHECKOUT","true");vi.stubEnv("CHECKOUT_RATE_LIMIT_SALT","test-only");});
describe("protecciones del checkout legado",()=>{
 it("rechaza origen externo sin usar service role",async()=>{
  expect((await POST(request({Origin:"https://evil.example"}))).status).toBe(403);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("limita tamaño y formato antes de consultar Supabase",async()=>{
  expect((await POST(request({},JSON.stringify({notes:"x".repeat(17000)})))).status).toBe(413);
  expect((await POST(request({},"{"))).status).toBe(400);
  expect((await POST(request({"Content-Type":"application/jsonp"}))).status).toBe(415);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
});
