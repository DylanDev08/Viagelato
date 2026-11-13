import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {GET as health} from "@/app/api/health/route";
import {POST as cron,matchesCronSecret} from "@/app/api/cron/expire-reservations/route";
import {connected,privilegedDb} from "@/lib/supabase";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({connected:vi.fn(),privilegedDb:vi.fn()}));
const endpoint="https://viagelato.vercel.app/api/cron/expire-reservations";
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("CRON_SECRET","cron-secret-test-32-bytes-never-publish-on-client");
 vi.mocked(connected).mockReturnValue(true);
});
afterEach(()=>vi.unstubAllEnvs());

describe("rutas de diagnóstico y tarea privada",()=>{
 it("publica solo estado de vida sin marcas de infraestructura ni claves",async()=>{
  const response=health();
  expect(await response.json()).toEqual({status:"ok"});
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toContain("noindex");
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("compara cron bearer sin revelar por qué falló",async()=>{
  expect(matchesCronSecret("Bearer cron-secret-test-32-bytes-never-publish-on-client",
    "cron-secret-test-32-bytes-never-publish-on-client")).toBe(true);
  expect(matchesCronSecret("Bearer otro","cron-secret-test-32-bytes-never-publish-on-client")).toBe(false);
  expect(matchesCronSecret(null,"cron-secret-test-32-bytes-never-publish-on-client")).toBe(false);
  expect(matchesCronSecret(null,"")).toBe(false);
  const missing=await cron(new Request(endpoint,{method:"POST"}));
  expect(missing.status).toBe(401);
  expect(missing.headers.get("cache-control")).toContain("no-store");
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("permite ejecutar solo cron con bearer correcto y responde sin caché",async()=>{
  const rpc=vi.fn(async()=>({data:3,error:null}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const response=await cron(new Request(endpoint,{method:"POST",headers:{
   Authorization:"Bearer cron-secret-test-32-bytes-never-publish-on-client"
  }}));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({released:3});
  expect(rpc).toHaveBeenCalledExactlyOnceWith("release_expired_order_reservations",{p_limit:250});
  expect(response.headers.get("cache-control")).toContain("no-store");
 });
 it("falla cerrado si cron no está configurado o la RPC falla",async()=>{
  vi.stubEnv("CRON_SECRET","");
  expect((await cron(new Request(endpoint,{method:"POST"}))).status).toBe(503);
  vi.stubEnv("CRON_SECRET","cron-secret-test-32-bytes-never-publish-on-client");
  const rpc=vi.fn(async()=>({data:null,error:{message:"private connection error"}}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const response=await cron(new Request(endpoint,{method:"POST",headers:{
   Authorization:"Bearer cron-secret-test-32-bytes-never-publish-on-client"
  }}));
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private connection error");
 });
});
