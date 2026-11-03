import {afterEach,describe,expect,it,vi} from "vitest";
import {getStore} from "@/lib/site";
import {getPublicCatalog} from "@/lib/catalog-source";
import {connected,publicConnected,publicDb,privilegedDb} from "@/lib/supabase";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({
 connected:vi.fn(()=>false),
 publicConnected:vi.fn(()=>false),
 publicDb:vi.fn(),
 privilegedDb:vi.fn(),
}));

afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});

describe("no usar precios viejos si falta Supabase en producción",()=>{
 it("bloquea las fichas comerciales y la tienda en vez de exponer el Excel obsoleto",async()=>{
  vi.stubEnv("NODE_ENV","production");
  vi.mocked(connected).mockReturnValue(false);
  vi.mocked(publicConnected).mockReturnValue(false);
  await expect(getPublicCatalog()).rejects.toThrow("vigente");
  await expect(getStore()).rejects.toThrow("temporalmente");
  expect(publicDb).not.toHaveBeenCalled();
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("permite los datos de demostración sólo durante desarrollo",async()=>{
  vi.stubEnv("NODE_ENV","test");
  vi.mocked(connected).mockReturnValue(false);
  vi.mocked(publicConnected).mockReturnValue(false);
  expect((await getPublicCatalog()).length).toBeGreaterThan(0);
  expect((await getStore()).demo).toBe(true);
 });
});
