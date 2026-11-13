import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST,PATCH,DELETE} from "@/app/api/admin/products/route";
import {privilegedDb} from "@/lib/supabase";
vi.mock("@/lib/admin",async()=>({
 adminOrError:vi.fn(async()=>null),
 productSchema:(await import("@/lib/admin-rules")).productSchema
}));
vi.mock("@/lib/supabase",()=>({privilegedDb:vi.fn()}));
const id="00000000-0000-4000-8000-000000000041";
const request=(method:string,payload:unknown)=>new Request("https://viagelato.vercel.app/api/admin/products",{
 method,headers:{"content-type":"application/json"},body:JSON.stringify(payload)
});
const draft={
 name:"Helado de prueba",slug:"helado-de-prueba",description:"Presentación de helado para comercios.",
 price:1200,stock:0,image_url:null,category_id:null,
 sku:"  ",presentation:"Caja",featured:false,commercially_verified:false,
 catalog_visible:false,active:false
};
beforeEach(()=>vi.clearAllMocks());

describe("POST /api/admin/products",()=>{
 it("crea un borrador sin publicar, normaliza SKU vacío y no agrega stock inventado",async()=>{
  const single=vi.fn().mockResolvedValue({data:{id,...draft,sku:null},error:null});
  const select=vi.fn().mockReturnValue({single});
  const insert=vi.fn().mockReturnValue({select});
  const from=vi.fn().mockReturnValue({insert});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await POST(request("POST",draft));
  expect(response.status).toBe(200);
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({stock:0,sku:null,active:false,catalog_visible:false}));
  expect((await response.json()).id).toBe(id);
 });
 it("rechaza publicar productos sin verificación, SKU o imagen",async()=>{
  const response=await POST(request("POST",{...draft,active:true}));
  expect(response.status).toBe(400);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("devuelve conflicto ante SKU o slug repetidos",async()=>{
  const single=vi.fn().mockResolvedValue({data:null,error:{code:"23505"}});
  const from=vi.fn().mockReturnValue({insert:vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({single})})});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await POST(request("POST",draft));
  expect(response.status).toBe(409);
 });
});

describe("PATCH /api/admin/products",()=>{
 it("edita una ficha existente sin modificar el ID, stock ni estado fuera del payload",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:{id,...draft,name:"Helado corregido"},error:null});
  const eq=vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({maybeSingle})});
  const update=vi.fn().mockReturnValue({eq});
  const from=vi.fn().mockReturnValue({update});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await PATCH(request("PATCH",{...draft,id,name:"Helado corregido"}));
  expect(response.status).toBe(200);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({name:"Helado corregido",stock:0,active:false,sku:null}));
  expect(update.mock.calls[0][0]).not.toHaveProperty("id");
  expect(eq).toHaveBeenCalledWith("id",id);
 });
 it("no informa éxito si la ficha ya no existe",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:null,error:null});
  const from=vi.fn().mockReturnValue({update:vi.fn().mockReturnValue({eq:vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({maybeSingle})})})});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await PATCH(request("PATCH",{...draft,id}));
  expect(response.status).toBe(404);
 });
 it("rechaza un ID que no sea UUID sin tocar la base",async()=>{
  const response=await PATCH(request("PATCH",{...draft,id:"INVALIDO"}));
  expect(response.status).toBe(400);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
});

describe("DELETE /api/admin/products",()=>{
 it("oculta un producto antes de cualquier eliminación permanente",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:{id},error:null});
  const eq=vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({maybeSingle})});
  const update=vi.fn().mockReturnValue({eq});
  const hardDelete=vi.fn();
  const from=vi.fn().mockReturnValue({update,delete:hardDelete});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await DELETE(request("DELETE",{id}));
  expect(response.status).toBe(200);
  expect(update).toHaveBeenCalledWith({active:false,catalog_visible:false});
  expect(hardDelete).not.toHaveBeenCalled();
 });
});
