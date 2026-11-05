import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/checkout/route";
import {privilegedDb} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({connected:()=>true,privilegedDb:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());

describe("protecciones del checkout legado",()=>{
 it("no puede reactivarse desde las variables ni mediante una solicitud maliciosa",async()=>{
  vi.stubEnv("ENABLE_CHECKOUT","true");
  vi.stubEnv("CHECKOUT_RATE_LIMIT_SALT","dedicated-test-key-of-at-least-32-ascii-bytes");
  const response=await POST();
  expect(response.status).toBe(410);
  expect((await response.json()).code).toBe("LEGACY_CHECKOUT_DISABLED");
  expect(privilegedDb).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
 });
 it("no toca Supabase ni permite reservar stock",async()=>{
  const response=await POST();
  expect(response.status).toBe(410);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
});
