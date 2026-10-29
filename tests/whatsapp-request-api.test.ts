import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/whatsapp-request/route";
import {connected,privilegedDb} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({connected:vi.fn(()=>true),privilegedDb:vi.fn()}));
const id="11111111-2222-4333-8444-555555555555",key="22222222-3333-4444-8555-666666666666";
const payload={customer_name:"Ana Gomez",locality:"Lanús",address:"Av. Mitre 123",notes:"",
 shipping_method:"shipping",items:[{id:"catalog-price-2",quantity:2}]};
const make=(body:unknown=payload,headers:Record<string,string>={})=>new Request("https://viagelato.vercel.app/api/whatsapp-request",{
 method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key,origin:"https://viagelato.vercel.app",...headers},
 body:JSON.stringify(body)
});
describe("registrar referencia WhatsApp",()=>{
 const store={id,request_fingerprint:""};
 const rpc=vi.fn(async()=>({data:true,error:null}));
 const create=vi.fn();
 beforeEach(()=>{
  vi.clearAllMocks();vi.mocked(connected).mockReturnValue(true);
  process.env.SUPABASE_SERVICE_ROLE_KEY="abcdefghijklmnopqrstuvwxyz0123456789SERVICE";
  process.env.CHECKOUT_RATE_LIMIT_SALT="test-only-salt";
  create.mockImplementation((obj:unknown)=>{store.request_fingerprint=(obj as {request_fingerprint:string}).request_fingerprint;return {select:()=>({maybeSingle:async()=>({data:{id,request_fingerprint:store.request_fingerprint},error:null})})};});
  vi.mocked(privilegedDb).mockReturnValue({
   rpc,
   from:vi.fn((table:string)=>{
    if(table==="site_settings")return {select:()=>({eq:()=>({single:async()=>({data:{whatsapp:"+5491140962202",free_shipping_threshold:60000,pickup_enabled:false},error:null})})})};
    if(table==="whatsapp_order_requests")return {upsert:create};
    throw Error("Tabla inesperada: "+table);
   })
  } as unknown as ReturnType<typeof privilegedDb>);
 });
 it("guarda sólo una solicitud de catálogo, con precio del servidor y sin cobrar",async()=>{
  const res=await POST(make());
  expect(res.status).toBe(201);
  const data=await res.json();
  expect(data.reference).toBe("VIA-111111112222");
  expect(data.whatsapp_url).toContain("https://wa.me/5491140962202?text=");
  expect(decodeURIComponent(data.whatsapp_url)).toContain("43.800");
  expect(decodeURIComponent(data.whatsapp_url)).toContain(data.reference);
  expect(data.status).toBe("draft");
  expect(create).toHaveBeenCalledWith(expect.objectContaining({subtotal:43800,customer_name:"Ana Gomez"}),expect.objectContaining({ignoreDuplicates:true}));
  expect(vi.mocked(privilegedDb)().rpc).toHaveBeenCalledWith("consume_checkout_attempt",expect.objectContaining({p_limit:8}));
 });
 it("rechaza origen ajeno, artículos repetidos y carrito inválido antes de escribir",async()=>{
  expect((await POST(make(payload,{origin:"https://evil.example"}))).status).toBe(403);
  expect((await POST(make({...payload,items:[payload.items[0],payload.items[0]]}))).status).toBe(400);
  expect((await POST(make({...payload,items:[{id:"catalog-price-47",quantity:1}]}))).status).toBe(400);
  expect(create).not.toHaveBeenCalled();
 });
 it("no registra si la base está sin conectar",async()=>{
  vi.mocked(connected).mockReturnValue(false);
  expect((await POST(make())).status).toBe(503);
  expect(create).not.toHaveBeenCalled();
 });
});
