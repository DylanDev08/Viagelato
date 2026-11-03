import {beforeEach,describe,expect,it,vi} from "vitest";
import {GET} from "@/app/api/admin/pages/route";
import {assertAdmin} from "@/lib/supabase";
import {loadAdminPage} from "@/lib/admin-pages";

vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn()}));
vi.mock("@/lib/admin-pages",()=>({loadAdminPage:vi.fn()}));
const req=(params="",headers?:Record<string,string>)=>new Request("https://viagelato.vercel.app/api/admin/pages"+params,{headers});
beforeEach(()=>{vi.resetAllMocks();vi.mocked(assertAdmin).mockResolvedValue({} as Awaited<ReturnType<typeof assertAdmin>>);});

describe("GET páginas administrativas",()=>{
 it("bloquea sin sesión incluso con cursor correcto",async()=>{
  vi.mocked(assertAdmin).mockRejectedValue(new Error("No autorizado"));
  const response=await GET(req("?kind=requests"));
  expect(response.status).toBe(401);
  expect(loadAdminPage).not.toHaveBeenCalled();
 });
 it("rechaza origen cross-site y clases de consulta no permitidas",async()=>{
  expect((await GET(req("?kind=orders",{"sec-fetch-site":"cross-site"}))).status).toBe(403);
  expect((await GET(req("?kind=customers"))).status).toBe(400);
  expect((await GET(req("?kind=requests&cursor="+ "x".repeat(300)))).status).toBe(400);
  expect(loadAdminPage).not.toHaveBeenCalled();
 });
 it("consulta sólo la clase validada, sin caché",async()=>{
  vi.mocked(loadAdminPage).mockResolvedValue({items:[],nextCursor:null});
  const response=await GET(req("?kind=requests&cursor=abc"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(loadAdminPage).toHaveBeenCalledWith("requests","abc");
 });
 it("no filtra errores internos cuando falla la carga",async()=>{
  vi.mocked(loadAdminPage).mockRejectedValue(new Error("postgres confidential email"));
  const response=await GET(req("?kind=orders"));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("confidential");
 });
 it("una consulta GET normal no exige Origin",async()=>{
  vi.mocked(loadAdminPage).mockResolvedValue({items:[],nextCursor:null});
  expect((await GET(req("?kind=orders"))).status).toBe(200);
 });
});
