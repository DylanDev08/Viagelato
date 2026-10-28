import {beforeEach,describe,expect,it,vi} from "vitest";
import {GET} from "@/app/api/admin/session/route";
import {assertAdmin} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn()}));
describe("sesión administrativa",()=>{
 beforeEach(()=>vi.mocked(assertAdmin).mockReset());
 it("confirma solamente una cuenta en admin_users",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id:"test-user"} as Awaited<ReturnType<typeof assertAdmin>>);
  const r=await GET();
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({authorized:true});
  expect(r.headers.get("cache-control")).toBe("no-store");
 });
 it("niega acceso cuando no hay sesión o autorización",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof assertAdmin>>);
  const r=await GET();
  expect(r.status).toBe(401);
  expect(await r.json()).toEqual({authorized:false});
 });
});
