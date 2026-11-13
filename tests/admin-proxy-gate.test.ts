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
 it("acepta sesión HttpOnly y no necesita que el navegador lea tokens",async()=>{
  getClaims.mockResolvedValue({data:{claims:{sub:"admin-server"}},error:null});
  const request=new NextRequest("https://viagelato.vercel.app/admin",{
   headers:{cookie:"viagelato-admin-server-v1.0=private-token"}
  });
  const result=await proxy(request);
  expect(result.status).toBe(200);
  expect(vi.mocked(createServerClient).mock.calls[0][2]).toMatchObject({
   cookieOptions:{name:"viagelato-admin-server-v1",httpOnly:true}
  });
 });
 it("durante el canary acepta la sesión legacy si falta la cookie del servidor",async()=>{
  getClaims.mockResolvedValueOnce({data:{claims:null},error:null})
   .mockResolvedValueOnce({data:{claims:{sub:"admin-legacy"}},error:null});
  const result=await proxy(new NextRequest("https://viagelato.vercel.app/admin"));
  expect(result.status).toBe(200);
  expect(createServerClient).toHaveBeenCalledTimes(2);
 });
 it("si ambas sesiones son inválidas, deniega el acceso",async()=>{
  getClaims.mockResolvedValue({data:{claims:null},error:null});
  const result=await proxy(new NextRequest("https://viagelato.vercel.app/admin"));
  expect(result.status).toBe(307);
  expect(createServerClient).toHaveBeenCalledTimes(2);
 });
 it("bloquea acceso ante ausencia de configuración de autenticación",async()=>{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","");
  const r=await proxy(new NextRequest("https://viagelato.vercel.app/admin"));
  expect(r.status).toBe(307);
  expect(createServerClient).not.toHaveBeenCalled();
 });
});
