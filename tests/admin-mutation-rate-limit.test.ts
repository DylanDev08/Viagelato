import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {adminMutationRateLimit,adminOrError} from "@/lib/admin";
import {assertAdmin,privilegedDb} from "@/lib/supabase";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn(),privilegedDb:vi.fn()}));
const userId="00000000-0000-4000-8000-000000000099";
const req=(path:string,origin="https://viagelato.vercel.app")=>new Request(
 "https://viagelato.vercel.app"+path,{
 method:"PATCH",headers:{Origin:origin,"Content-Type":"application/json"},
 body:"{}"
});
const rpc=vi.fn();
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("CHECKOUT_RATE_LIMIT_SALT","viagelato-admin-rate-limit-test-secret-longer-than-32");
 vi.mocked(assertAdmin).mockResolvedValue({id:userId} as Awaited<ReturnType<typeof assertAdmin>>);
 rpc.mockResolvedValue({data:true,error:null});
 vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
});
afterEach(()=>vi.unstubAllEnvs());

describe("límite atómico de mutaciones del administrador",()=>{
 it("permite una mutación autenticada mediante Postgres y almacena un hash, no la identidad",async()=>{
  const response=await adminOrError(req("/api/admin/products"));
  expect(response).toBeNull();
  expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_checkout_attempt",{
   p_key_hash:expect.stringMatching(/^[0-9a-f]{64}$/),
   p_idempotency_key:expect.any(String),p_limit:80,p_window_minutes:10
  });
  const params=rpc.mock.calls[0][1];
  expect(params.p_key_hash).not.toContain(userId);
  expect(params.p_key_hash).not.toContain("viagelato-admin-rate-limit-test-secret");
 });
 it("pone límites menores a imágenes y a movimientos de pagos",async()=>{
  await adminMutationRateLimit(req("/api/admin/upload"),userId);
  expect(rpc).toHaveBeenLastCalledWith("consume_checkout_attempt",expect.objectContaining({p_limit:20}));
  await adminMutationRateLimit(req("/api/admin/whatsapp-requests"),userId);
  expect(rpc).toHaveBeenLastCalledWith("consume_checkout_attempt",expect.objectContaining({p_limit:40}));
  await adminMutationRateLimit(req("/api/admin/products"),userId);
  expect(rpc).toHaveBeenLastCalledWith("consume_checkout_attempt",expect.objectContaining({p_limit:80}));
  const keys=rpc.mock.calls.map(x=>x[1].p_key_hash);
  expect(new Set(keys).size).toBe(3);
 });
 it("responde 429 y Retry-After cuando se excedió el límite",async()=>{
  rpc.mockResolvedValue({data:false,error:null});
  const response=await adminOrError(req("/api/admin/orders"));
  expect(response?.status).toBe(429);
  expect(response?.headers.get("retry-after")).toBe("600");
  expect(response?.headers.get("cache-control")).toContain("no-store");
 });
 it("falla cerrado si Postgres no responde o falta el secreto",async()=>{
  rpc.mockResolvedValue({data:null,error:{message:"unavailable"}});
  expect((await adminOrError(req("/api/admin/products")))?.status).toBe(503);
  rpc.mockRejectedValue(new Error("offline"));
  expect((await adminOrError(req("/api/admin/products")))?.status).toBe(503);
  vi.stubEnv("CHECKOUT_RATE_LIMIT_SALT","");
  rpc.mockClear();
  expect((await adminOrError(req("/api/admin/products")))?.status).toBe(503);
  expect(rpc).not.toHaveBeenCalled();
 });
 it("rechaza CSRF y usuarios sin rol antes de consultar la base",async()=>{
  expect((await adminOrError(req("/api/admin/products","https://evil.example")))?.status).toBe(403);
  expect(assertAdmin).not.toHaveBeenCalled();
  vi.mocked(assertAdmin).mockRejectedValueOnce(new Error("forbidden"));
  expect((await adminOrError(req("/api/admin/products")))?.status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
 });
 it("no somete lecturas autenticadas a la cuota de escritura",async()=>{
  const result=await adminMutationRateLimit(
   new Request("https://viagelato.vercel.app/api/admin/session",{method:"GET"}),userId);
  expect(result).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
 });
});
