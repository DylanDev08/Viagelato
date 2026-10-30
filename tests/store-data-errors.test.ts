import {beforeEach,describe,expect,it,vi} from "vitest";
import {getStore} from "@/lib/site";
import {publicDb,connected} from "@/lib/supabase";
vi.mock("@/lib/supabase",()=>({publicDb:vi.fn(),connected:vi.fn(()=>true)}));
const tables=["site_settings","products","categories","shipping_zones","banners"];
function database(failing?:string){return {from:(table:string)=>{
 const response={data:table==="site_settings"?{name:"Tienda vigente"}:[],error:table===failing?{message:"PRIVATE SQL DETAIL"}:null};
 const query={select:()=>query,eq:()=>query,gt:()=>query,not:()=>query,
  single:async()=>response,order:async()=>response,then:(resolve:(value:unknown)=>void)=>Promise.resolve(response).then(resolve)};
 return query;
}};}
beforeEach(()=>vi.mocked(connected).mockReturnValue(true));
describe("lectura de tienda ante errores",()=>{
 for(const table of tables)it(`no publica valores comerciales por defecto si falla ${table}`,async()=>{
  vi.mocked(publicDb).mockReturnValue(database(table) as unknown as ReturnType<typeof publicDb>);
  await expect(getStore()).rejects.toThrow("No pudimos cargar");
 });
 it("conserva la configuración vigente cuando todas las consultas responden",async()=>{
  vi.mocked(publicDb).mockReturnValue(database() as unknown as ReturnType<typeof publicDb>);
  expect((await getStore()).settings.name).toBe("Tienda vigente");
 });
});
