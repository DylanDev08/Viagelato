import {beforeEach,describe,expect,it,vi} from "vitest";
import {PATCH} from "@/app/api/admin/whatsapp-requests/route";
import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {adminRequestError} from "@/lib/admin";
vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn(),privilegedDb:vi.fn()}));
vi.mock("@/lib/admin",()=>({adminRequestError:vi.fn(()=>null)}));
const id="11111111-2222-4333-8444-555555555555";
const key="22222222-3333-4444-8555-666666666666";
const req=(data:unknown)=>new Request("https://viagelato.vercel.app/api/admin/whatsapp-requests",{
 method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
});
describe("acciones seguras de WhatsApp en administrador",()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(adminRequestError).mockReturnValue(null);});
 it("bloquea usuario no autorizado antes de procesar una transferencia",async()=>{
  vi.mocked(assertAdmin).mockRejectedValue(new Error("No autorizado"));
  const res=await PATCH(req({id,action:"record_payment",amount:10000,payment_key:key}));
  expect(res.status).toBe(401);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("rechaza estado, UUID e importes inválidos y bloquea marcar pagado sin monto",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  expect((await PATCH(req({id:"no",action:"contacted"}))).status).toBe(400);
  expect((await PATCH(req({id,action:"mark_paid"}))).status).toBe(400);
  expect((await PATCH(req({id,action:"inventado"}))).status).toBe(400);
  expect((await PATCH(req({id,action:"confirm_terms",stock_confirmed:false,shipping_cost:0}))).status).toBe(400);
  expect((await PATCH(req({id,action:"confirm_terms",stock_confirmed:true,shipping_cost:-2}))).status).toBe(400);
  expect((await PATCH(req({id,action:"record_payment",amount:0,payment_key:key}))).status).toBe(400);
  expect((await PATCH(req({id,action:"record_payment",amount:100,payment_key:"bad"}))).status).toBe(400);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("envía identidad administrativa a la función que valida estados",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  const rpc=vi.fn(async()=>({data:true,error:null}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const res=await PATCH(req({id,action:"contacted"}));
  expect(res.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_update_whatsapp_request",{
   p_request_id:id,p_action:"contacted",p_actor_user_id:id
  });
 });
 it("registra condiciones acordadas sin tocar stock",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  const rpc=vi.fn(async()=>({data:true,error:null}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const res=await PATCH(req({id,action:"confirm_terms",stock_confirmed:true,shipping_cost:3500}));
  expect(res.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_confirm_whatsapp_terms",{
   p_request_id:id,p_actor_user_id:id,p_stock_confirmed:true,p_shipping_cost:3500
  });
 });
 it("recibe importe real, referencia bancaria y clave de idempotencia",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  const rpc=vi.fn(async()=>({data:true,error:null}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const res=await PATCH(req({id,action:"record_payment",amount:15400,payment_key:key,transfer_reference:"  OP-123 "}));
  expect(res.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_record_whatsapp_payment",{
   p_request_id:id,p_actor_user_id:id,p_amount:15400,p_payment_key:key,p_transfer_reference:"OP-123"
  });
 });
 it("no informa éxito ante error de la función transaccional",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  const rpc=vi.fn(async()=>({data:null,error:{message:"Pago superior al saldo"}}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const res=await PATCH(req({id,action:"record_payment",amount:20000,payment_key:key}));
  expect(res.status).toBe(409);
  expect((await res.json()).error).not.toContain("Pago superior");
 });
});
