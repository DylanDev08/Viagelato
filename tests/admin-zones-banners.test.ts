import {beforeEach,describe,expect,it,vi} from "vitest";
import {PATCH as updateZone,DELETE as disableZone} from "@/app/api/admin/zones/route";
import {PATCH as updateBanner,DELETE as deleteBanner} from "@/app/api/admin/banners/route";
import {privilegedDb} from "@/lib/supabase";

vi.mock("@/lib/admin",async()=>({
 adminOrError:vi.fn(async()=>null),
 zoneSchema:(await import("@/lib/admin-rules")).zoneSchema,
 bannerSchema:(await import("@/lib/admin-rules")).bannerSchema
}));
vi.mock("@/lib/supabase",()=>({privilegedDb:vi.fn()}));
const id="00000000-0000-4000-8000-000000000001";
const req=(method:string,path:string,payload:unknown)=>new Request("https://viagelato-api.onrender.com/api/admin/"+path,{method,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
describe("zona y banner: acciones administrativas seguras",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("rechaza IDs inválidos sin tocar la base",async()=>{
  const out=await Promise.all([
   updateZone(req("PATCH","zones",{id:"incorrecto"})),
   disableZone(req("DELETE","zones",{id:"incorrecto"})),
   updateBanner(req("PATCH","banners",{id:"incorrecto"})),
   deleteBanner(req("DELETE","banners",{id:"incorrecto"}))
  ]);
  expect(out.map(x=>x.status)).toEqual([400,400,400,400]);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("no comunica éxito si el banner desapareció",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:null,error:null});
  const select=vi.fn().mockReturnValue({maybeSingle});
  const eq=vi.fn().mockReturnValue({select});
  const del=vi.fn().mockReturnValue({eq});
  vi.mocked(privilegedDb).mockReturnValue({from:vi.fn().mockReturnValue({delete:del})} as unknown as ReturnType<typeof privilegedDb>);
  const result=await deleteBanner(req("DELETE","banners",{id}));
  expect(result.status).toBe(404);
  expect((await result.json()).error).toContain("no existe");
 });
 it("no comunica éxito si la zona ya no existe",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:null,error:null});
  const select=vi.fn().mockReturnValue({maybeSingle});
  const eq=vi.fn().mockReturnValue({select});
  const update=vi.fn().mockReturnValue({eq});
  vi.mocked(privilegedDb).mockReturnValue({from:vi.fn().mockReturnValue({update})} as unknown as ReturnType<typeof privilegedDb>);
  const result=await disableZone(req("DELETE","zones",{id}));
  expect(result.status).toBe(404);
 });
 it("permite desactivar una zona existente",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:{id},error:null});
  const select=vi.fn().mockReturnValue({maybeSingle});
  const eq=vi.fn().mockReturnValue({select});
  const update=vi.fn().mockReturnValue({eq});
  vi.mocked(privilegedDb).mockReturnValue({from:vi.fn().mockReturnValue({update})} as unknown as ReturnType<typeof privilegedDb>);
  const result=await disableZone(req("DELETE","zones",{id}));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ok:true});
 });
});
