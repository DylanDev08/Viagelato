import {describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/checkout/route";
import {privilegedDb} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({connected:vi.fn(()=>true),privilegedDb:vi.fn()}));

describe("checkout anterior retirado",()=>{
 it.each(["false","true"])("rechaza pedidos aun con ENABLE_CHECKOUT=%s",async flag=>{
  vi.stubEnv("ENABLE_CHECKOUT",flag);
  const response=await POST();
  expect(response.status).toBe(410);
  expect(await response.json()).toEqual({
   error:"El checkout anterior fue retirado. Prepará tu pedido desde el carrito por WhatsApp.",
   code:"LEGACY_CHECKOUT_DISABLED"
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(privilegedDb).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
 });
});
