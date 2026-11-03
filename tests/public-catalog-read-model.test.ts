import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {getPublicCatalog} from "@/lib/catalog-source";
import {readPublicCategories} from "@/lib/public-categories";
import {connected,publicConnected,publicDb,privilegedDb} from "@/lib/supabase";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({
 connected:vi.fn(()=>true),
 publicConnected:vi.fn(()=>true),
 publicDb:vi.fn(),
 privilegedDb:vi.fn(),
}));
vi.mock("@/lib/public-categories",()=>({readPublicCategories:vi.fn()}));

const sample=CATALOG_PRICE_ITEMS[0];
const row={
 slug:`excel-fila-${sample.sourceRow}`,
 name:"Seitu actualizado",sku:sample.sku,description:"Presentación actualizada",
 price:18900,presentation:"Caja x24",image_url:"/catalogo/nueva.webp",
 category_id:"c1",catalog_visible:true
};
const read=vi.fn();
const fromPublic=vi.fn();
const fromPrivileged=vi.fn();

function chain(result:unknown){
 const order=vi.fn(async()=>result);
 const eq=vi.fn(()=>({order}));
 return {select:vi.fn(()=>({order,eq}))};
}

beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("PUBLIC_CATALOG_READ_MODEL","true");
 vi.mocked(connected).mockReturnValue(true);
 vi.mocked(publicConnected).mockReturnValue(true);
 vi.mocked(readPublicCategories).mockResolvedValue({
  data:[{id:"c1",name:"Palitos y conos"}],error:null
 } as Awaited<ReturnType<typeof readPublicCategories>>);
 read.mockResolvedValue({data:[row],error:null});
 fromPublic.mockImplementation((table:string)=>{
  if(table!=="catalog_public")throw Error("Unexpected public table: "+table);
  return chain({data:[row],error:null});
 });
 fromPrivileged.mockImplementation((table:string)=>{
  if(table!=="products")throw Error("Unexpected private table: "+table);
  return chain({data:[row],error:null});
 });
 vi.mocked(publicDb).mockReturnValue({from:fromPublic} as unknown as ReturnType<typeof publicDb>);
 vi.mocked(privilegedDb).mockReturnValue({from:fromPrivileged} as unknown as ReturnType<typeof privilegedDb>);
});
afterEach(()=>vi.unstubAllEnvs());

describe("catálogo con permisos mínimos y transición controlada",()=>{
 it("con la vista activada, nunca consulta la fuente privilegiada",async()=>{
  const items=await getPublicCatalog();
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
   name:"Seitu actualizado",price:18900,image:"/catalogo/nueva.webp",
   category:"Palitos y conos",
  });
  expect(fromPublic).toHaveBeenCalledWith("catalog_public");
  expect(privilegedDb).not.toHaveBeenCalled();
 });

 it("aunque falte service_role, la vista pública puede consultar",async()=>{
  vi.mocked(connected).mockReturnValue(false);
  expect(await getPublicCatalog()).toHaveLength(1);
  expect(privilegedDb).not.toHaveBeenCalled();
 });

 it("si falla la vista, no recurre a service_role ni precios históricos",async()=>{
  fromPublic.mockImplementation(()=>chain({data:null,error:{code:"42501"}}));
  await expect(getPublicCatalog()).rejects.toThrow("No se pudo consultar");
  expect(privilegedDb).not.toHaveBeenCalled();
 });

 it("la bandera apagada conserva el acceso anterior durante la migración",async()=>{
  vi.stubEnv("PUBLIC_CATALOG_READ_MODEL","false");
  expect(await getPublicCatalog()).toHaveLength(1);
  expect(privilegedDb).toHaveBeenCalledOnce();
  expect(fromPrivileged).toHaveBeenCalledWith("products");
 });

 it("el modo anterior falla cerrado si no existe permiso privado",async()=>{
  vi.stubEnv("PUBLIC_CATALOG_READ_MODEL","false");
  vi.mocked(connected).mockReturnValue(false);
  await expect(getPublicCatalog()).rejects.toThrow("fuente comercial");
  expect(privilegedDb).not.toHaveBeenCalled();
 });
});
