import {beforeEach,describe,expect,it,vi} from "vitest";
import {GET} from "@/app/api/admin/session/route";
import {assertAdmin,connected} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn(),connected:vi.fn(()=>true)}));
describe("sesión administrativa",()=>{
 beforeEach(()=>{vi.mocked(assertAdmin).mockReset();vi.mocked(connected).mockReturnValue(true);});
 it("confirma solamente una cuenta en admin_users",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id:"test-user"} as Awaited<ReturnType<typeof assertAdmin>>);
  const r=await GET();
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({authorized:true});
  expect(r.headers.get("cache-control")).toBe("no-store");
 });
 it("en preview sin credenciales privilegiadas informa indisponibilidad, no falta de permisos",async()=>{
  vi.mocked(connected).mockReturnValue(false);
  const response=await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({authorized:false,reason:"admin_unavailable"});
  expect(assertAdmin).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");
 });
 it("devuelve 403 si el usuario no figura en admin_users",async()=>{
  vi.mocked(assertAdmin).mockRejectedValue(new Error("No tenés permiso de administrador"));
  expect((await GET()).status).toBe(403);
 });
 it("devuelve 503 cuando Supabase no puede consultar la tabla administrativa",async()=>{
  vi.mocked(assertAdmin).mockRejectedValue(new Error("No se pudo verificar el permiso administrativo"));
  expect((await GET()).status).toBe(503);
 });
 it("niega acceso cuando no hay sesión o autorización",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof assertAdmin>>);
  const r=await GET();
  expect(r.status).toBe(401);
  expect(await r.json()).toEqual({authorized:false});
 });
});
