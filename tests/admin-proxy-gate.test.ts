import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {proxy} from "@/proxy";

vi.mock("@supabase/ssr",()=>({createServerClient:vi.fn()}));
const getClaims=vi.fn();
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.supabase.co");
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");
 vi.mocked(createServerClient).mockReturnValue({
  auth:{getClaims}
 } as unknown as ReturnType<typeof createServerClient>);
});
afterEach(()=>vi.unstubAllEnvs());

describe("protección anticipada de ruta de administración",()=>{
 it("redirecciona a login cuando no hay sesión, sin mostrar panel",async()=>{
  getClaims.mockResolvedValue({data:{claims:null},error:null});
  const r=await proxy(new NextRequest("https://viagelato.vercel.app/admin"));
  expect(r.status).toBe(307);
  expect(r.headers.get("location")).toBe("https://viagelato.vercel.app/login");
  expect(r.headers.get("cache-control")).toContain("no-store");
 });
 it("responde 401 JSON en endpoints admin sin credenciales",async()=>{
  getClaims.mockResolvedValue({data:{claims:null},error:null});
  const r=await proxy(new NextRequest("https://viagelato.vercel.app/api/admin/products"));
  expect(r.status).toBe(401);
  expect(r.headers.get("cache-control")).toContain("no-store");
 });
 it("también deniega errores de firma y fallos de autenticación",async()=>{
  getClaims.mockRejectedValue(new Error("bad token"));
  const r=await proxy(new NextRequest("https://viagelato.vercel.app/api/admin/session"));
  expect(r.status).toBe(401);
 });
 it("permite sesiones válidas para que assertAdmin confirme el rol",async()=>{
  getClaims.mockResolvedValue({data:{claims:{sub:"user-123"}},error:null});
  const r=await proxy(new NextRequest("https://viagelato.vercel.app/admin"));
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("x-robots-tag")).toContain("noindex");
 });
 it("bloquea acceso ante ausencia de configuración de autenticación",async()=>{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","");
  const r=await proxy(new NextRequest("https://viagelato.vercel.app/admin"));
  expect(r.status).toBe(307);
  expect(createServerClient).not.toHaveBeenCalled();
 });
});
