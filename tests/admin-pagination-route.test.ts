import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/admin",()=>({adminOrError:vi.fn()}));
vi.mock("@/lib/admin-pagination",()=>({
 adminPageKind:{safeParse:vi.fn(value=>["orders","whatsapp"].includes(value)?{success:true,data:value}:{success:false})},
 decodeAdminCursor:vi.fn(value=>value==="bad"?(()=>{throw new Error("Cursor inválido")})():null),
 loadAdminPage:vi.fn(async()=>({items:[],nextCursor:null}))
}));
import {NextResponse} from "next/server";
import {adminOrError} from "@/lib/admin";
import {loadAdminPage} from "@/lib/admin-pagination";
import {GET} from "@/app/api/admin/paginated-orders/route";
beforeEach(()=>{vi.clearAllMocks();vi.mocked(adminOrError).mockResolvedValue(null);});
describe("API paginada privada",()=>{
 const url=(query:string)=>new Request(`https://viagelato.vercel.app/api/admin/paginated-orders?${query}`);
 it("bloquea sin sesión antes de consultar datos",async()=>{
  vi.mocked(adminOrError).mockResolvedValue(NextResponse.json({error:"No autorizado"},{status:401}));
  const result=await GET(url("kind=orders"));
  expect(result.status).toBe(401);
  expect(loadAdminPage).not.toHaveBeenCalled();
 });
 it("rechaza tipo de lista y cursor inválidos",async()=>{
  expect((await GET(url("kind=products"))).status).toBe(400);
  expect((await GET(url("kind=orders&cursor=bad"))).status).toBe(400);
  expect(loadAdminPage).not.toHaveBeenCalled();
 });
 it("consulta solo listado admin y deshabilita caché",async()=>{
  const response=await GET(url("kind=whatsapp"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-robots-tag")).toContain("noindex");
  expect(loadAdminPage).toHaveBeenCalledWith("whatsapp",null);
 });
});
