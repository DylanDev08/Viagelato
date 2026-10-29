import {beforeEach,describe,expect,it,vi} from "vitest";
import {PATCH} from "@/app/api/admin/whatsapp-requests/route";
import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {adminRequestError} from "@/lib/admin";
vi.mock("@/lib/supabase",()=>({assertAdmin:vi.fn(),privilegedDb:vi.fn()}));
vi.mock("@/lib/admin",()=>({adminRequestError:vi.fn(()=>null)}));
const id="11111111-2222-4333-8444-555555555555";
const req=(data:unknown)=>new Request("https://viagelato.vercel.app/api/admin/whatsapp-requests",{
 method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
});
describe("acciones seguras de WhatsApp en administrador",()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(adminRequestError).mockReturnValue(null);});
 it("bloquea usuario no autorizado",async()=>{
  vi.mocked(assertAdmin).mockRejectedValue(new Error("No autorizado"));
  const res=await PATCH(req({id,action:"mark_paid"}));
  expect(res.status).toBe(401);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("rechaza estado y UUID inválidos",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  expect((await PATCH(req({id:"no",action:"mark_paid"}))).status).toBe(400);
  expect((await PATCH(req({id,action:"inventado"}))).status).toBe(400);
 });
 it("envía identidad autorizada a RPC que impone transiciones",async()=>{
  vi.mocked(assertAdmin).mockResolvedValue({id} as Awaited<ReturnType<typeof assertAdmin>>);
  const rpc=vi.fn(async()=>({data:true,error:null}));
  vi.mocked(privilegedDb).mockReturnValue({rpc} as unknown as ReturnType<typeof privilegedDb>);
  const res=await PATCH(req({id,action:"contacted"}));
  expect(res.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_update_whatsapp_request",{
   p_request_id:id,p_action:"contacted",p_actor_user_id:id
  });
 });
});
