import {beforeEach,describe,expect,it,vi} from "vitest";
import {DELETE} from "@/app/api/admin/products/route";
import {privilegedDb} from "@/lib/supabase";
vi.mock("@/lib/admin",()=>({adminOrError:vi.fn(async()=>null)}));
vi.mock("@/lib/supabase",()=>({privilegedDb:vi.fn()}));
const id="00000000-0000-4000-8000-000000000009";
const request=(body:unknown)=>new Request("https://viagelato.vercel.app/api/admin/products",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>vi.clearAllMocks());
describe("DELETE definitivo de productos",()=>{
 it("rechaza órdenes no reconocidas sin abrir la base",async()=>{
  const result=await DELETE(request({id,action:"invalid"}));
  expect(result.status).toBe(400);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("no borra fichas publicadas: hay que ocultarlas primero",async()=>{
  const single=vi.fn().mockResolvedValue({data:{id,active:true,catalog_visible:false},error:null});
  const eq=vi.fn().mockReturnValue({maybeSingle:single});
  const from=vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({eq})});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await DELETE(request({id,action:"delete_permanently"}));
  expect(response.status).toBe(409);
  expect(from).toHaveBeenCalledOnce();
 });
 it("bloquea el borrado si existe un pedido o solicitud de WhatsApp",async()=>{
  const single=vi.fn().mockResolvedValue({data:{id,active:false,catalog_visible:false},error:null});
  const selected=vi.fn().mockReturnValue({eq:vi.fn().mockReturnValue({maybeSingle:single})});
  const history=vi.fn().mockResolvedValue({count:1,error:null});
  const whatsapp=vi.fn().mockResolvedValue({count:0,error:null});
  const deletion=vi.fn();
  const from=vi.fn((table:string)=>table==="products"?{select:selected,delete:deletion}:table==="order_items"?{select:vi.fn().mockReturnValue({eq:history})}:{select:vi.fn().mockReturnValue({contains:whatsapp})});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await DELETE(request({id,action:"delete_permanently"}));
  expect(response.status).toBe(409);
  expect(deletion).not.toHaveBeenCalled();
 });
 it("elimina solamente un borrador sin referencias y confirma el registro",async()=>{
  const single=vi.fn().mockResolvedValue({data:{id,active:false,catalog_visible:false},error:null});
  const selectProduct=vi.fn().mockReturnValue({eq:vi.fn().mockReturnValue({maybeSingle:single})});
  const deletedSingle=vi.fn().mockResolvedValue({data:{id},error:null});
  const deleteProduct=vi.fn().mockReturnValue({eq:vi.fn().mockReturnValue({eq:vi.fn().mockReturnValue({eq:vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({maybeSingle:deletedSingle})})})})});
  const history=vi.fn().mockResolvedValue({count:0,error:null});
  const whatsapp=vi.fn().mockResolvedValue({count:0,error:null});
  const from=vi.fn((table:string)=>table==="products"?{select:selectProduct,delete:deleteProduct}:table==="order_items"?{select:vi.fn().mockReturnValue({eq:history})}:{select:vi.fn().mockReturnValue({contains:whatsapp})});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const response=await DELETE(request({id,action:"delete_permanently"}));
  expect(response.status).toBe(200);
  expect((await response.json()).deleted).toBe(true);
  expect(deleteProduct).toHaveBeenCalledOnce();
 });
});
