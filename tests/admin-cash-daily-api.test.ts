import {beforeEach,describe,expect,it,vi} from "vitest";
import {PATCH} from "@/app/api/admin/whatsapp-requests/route";
import {GET} from "@/app/api/admin/whatsapp-summary/route";
import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {adminRequestError} from "@/lib/admin";

vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn(),privilegedDb:vi.fn()}));
vi.mock("@/lib/admin",()=>({adminRequestError:vi.fn(()=>null)}));
const actor="11111111-2222-4333-8444-555555555555";
const requestId="22222222-3333-4444-8555-666666666666";
const key="33333333-4444-4555-8666-777777777777";
const patch=(data:unknown)=>new Request("https://viagelato.vercel.app/api/admin/whatsapp-requests",{
 method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
});
describe("efectivo y resumen diario del administrador",()=>{
 const rpc=vi.fn();
 beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(adminRequestError).mockReturnValue(null);
  vi.mocked(assertAdmin).mockResolvedValue({id:actor} as Awaited<ReturnType<typeof assertAdmin>>);
  rpc.mockResolvedValue({data:true,error:null});
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
 });
 it("registra efectivo solo mediante la función transaccional protegida",async()=>{
  const response=await PATCH(patch({id:requestId,action:"record_cash",amount:15000,payment_key:key}));
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_record_whatsapp_cash",{
   p_request_id:requestId,p_actor_user_id:actor,p_amount:15000,p_payment_key:key
  });
 });
 it("rechaza efectivo sin importe, idempotencia o con referencia bancaria",async()=>{
  for(const body of [
   {id:requestId,action:"record_cash",amount:0,payment_key:key},
   {id:requestId,action:"record_cash",amount:1500,payment_key:"no-uuid"},
   {id:requestId,action:"record_cash",amount:1500,payment_key:key,transfer_reference:"BANCO"},
  ])expect((await PATCH(patch(body))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
 });
 it("impide registrar efectivo a usuarios no autorizados",async()=>{
  vi.mocked(assertAdmin).mockRejectedValueOnce(new Error("Sin acceso"));
  expect((await PATCH(patch({id:requestId,action:"record_cash",amount:1500,payment_key:key}))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
 });
 it("devuelve informe completo del día desde base sin consultar tarjetas recientes",async()=>{
  const summary={day:"2026-10-30",prepared_count:3,confirmed_count:2,
   confirmed_amount:60000,cash_received:10000,transfer_received:12000,outstanding_amount:38000};
  rpc.mockResolvedValue({data:summary,error:null});
  const response=await GET(new Request("https://viagelato.vercel.app/api/admin/whatsapp-summary?day=2026-10-30"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(summary);
  expect(rpc).toHaveBeenCalledWith("admin_whatsapp_daily_summary",{
   p_day:"2026-10-30",p_actor_user_id:actor
  });
  expect(response.headers.get("Cache-Control")).toContain("no-store");
 });
 it("rechaza fechas inválidas y restringe el resumen a admins",async()=>{
  expect((await GET(new Request("https://viagelato.vercel.app/api/admin/whatsapp-summary?day=2026-02-30"))).status).toBe(400);
  vi.mocked(assertAdmin).mockRejectedValueOnce(new Error("Sin acceso"));
  expect((await GET(new Request("https://viagelato.vercel.app/api/admin/whatsapp-summary?day=2026-10-30"))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
 });
});
