import {beforeEach,describe,expect,it,vi} from "vitest";
import {PATCH as patchProduct,DELETE as hideProduct} from "@/app/api/admin/products/route";
import {DELETE as deleteCategory} from "@/app/api/admin/categories/route";
import {PUT as saveSettings} from "@/app/api/admin/settings/route";
import {privilegedDb} from "@/lib/supabase";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("@/lib/admin",async()=>({
 adminOrError:vi.fn(async()=>null),
 productSchema:(await import("@/lib/admin-rules")).productSchema,
 settingsSchema:(await import("@/lib/admin-rules")).settingsSchema
}));
vi.mock("@/lib/supabase",()=>({privilegedDb:vi.fn()}));
const validUuid="00000000-0000-4000-8000-000000000001";
const req=(method:string,path:string,data:unknown)=>new Request(`https://viagelato-api.onrender.com/api/admin/${path}`,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});

describe("CRUD administrativo con ID seguro y estado real",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("rechaza IDs malformados ANTES de consultar la base",async()=>{
  const x=await patchProduct(req("PATCH","products",{id:"bad"}));
  const y=await hideProduct(req("DELETE","products",{id:"not-uuid"}));
  const z=await deleteCategory(req("DELETE","categories",{id:"invalid"}));
  expect([x.status,y.status,z.status]).toEqual([400,400,400]);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("impide eliminar categorías con productos existentes",async()=>{
  const eq=vi.fn().mockResolvedValue({count:5,error:null});
  const select=vi.fn().mockReturnValue({eq});
  vi.mocked(privilegedDb).mockReturnValue({from:vi.fn().mockReturnValue({select})} as unknown as ReturnType<typeof privilegedDb>);
  const r=await deleteCategory(req("DELETE","categories",{id:validUuid}));
  expect(r.status).toBe(409);
  expect((await r.json()).error).toContain("5 productos");
 });
 it("da 404 cuando el producto a ocultar ya no existe",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:null,error:null});
  const select=vi.fn().mockReturnValue({maybeSingle});
  const eq=vi.fn().mockReturnValue({select});
  const update=vi.fn().mockReturnValue({eq});
  vi.mocked(privilegedDb).mockReturnValue({from:vi.fn().mockReturnValue({update})} as unknown as ReturnType<typeof privilegedDb>);
  const r=await hideProduct(req("DELETE","products",{id:validUuid}));
  expect(r.status).toBe(404);
 });
 it("guarda la configuración vía una sola función atómica",async()=>{
  const rpc=vi.fn().mockResolvedValue({data:{name:"Viagelato S.A."},error:null});
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const settings=Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([key])=>key!=="id"));
  const r=await saveSettings(req("PUT","settings",settings));
  expect(r.status).toBe(200);
  expect(rpc).toHaveBeenCalledOnce();
  expect(rpc).toHaveBeenCalledWith("admin_save_store_settings",{p_data:settings});
 });
 it("no comunica éxito si falla la transacción de configuración",async()=>{
  const rpc=vi.fn().mockResolvedValue({data:null,error:{message:"rollback"}});
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const settings=Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([key])=>key!=="id"));
  const r=await saveSettings(req("PUT","settings",settings));
  expect(r.status).toBe(400);
  expect((await r.json()).error).toContain("No se aplicaron cambios parciales");
 });
});
