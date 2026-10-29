import {createHash} from "node:crypto";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/whatsapp-request/route";
import {connected,privilegedDb} from "@/lib/supabase";

vi.mock("@/lib/supabase",()=>({connected:vi.fn(()=>true),privilegedDb:vi.fn()}));
vi.mock("@/lib/site",()=>({getPublishedCatalog:vi.fn(async()=> (await import("@/lib/catalog-prices")).CATALOG_PRICE_ITEMS)}));
const id="11111111-2222-4333-8444-555555555555",key="22222222-3333-4444-8555-666666666666";
const payload={customer_name:"Ana Gomez",locality:"Lanús",address:"Av. Mitre 123",notes:"",
 shipping_method:"shipping",items:[{id:"catalog-price-2",quantity:2}]};
const make=(body:unknown=payload,headers:Record<string,string>={})=>new Request("https://viagelato.vercel.app/api/whatsapp-request",{
 method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key,origin:"https://viagelato.vercel.app",...headers},
 body:JSON.stringify(body)
});
function fingerprint(input:unknown){return createHash("sha256").update(JSON.stringify(input)).digest("hex");}

describe("registrar referencia WhatsApp",()=>{
 const rpc=vi.fn(async()=>({data:true,error:null}));
 const insert=vi.fn();
 const priorRead=vi.fn(async():Promise<{data:Record<string,unknown>|null;error:null}>=>({data:null,error:null}));
 beforeEach(()=>{
  vi.clearAllMocks();vi.mocked(connected).mockReturnValue(true);
  process.env.SUPABASE_SERVICE_ROLE_KEY="abcdefghijklmnopqrstuvwxyz0123456789SERVICE";
  process.env.CHECKOUT_RATE_LIMIT_SALT="test-only-salt";
  priorRead.mockResolvedValue({data:null,error:null});
  insert.mockImplementation((input:Record<string,unknown>)=>{
   const record={...input,id,status:"draft"};
   return {select:()=>({maybeSingle:async()=>({data:record,error:null})})};
  });
  vi.mocked(privilegedDb).mockReturnValue({
   rpc,
   from:vi.fn((table:string)=>{
    if(table==="site_settings")return {select:()=>({eq:()=>({single:async()=>({data:{whatsapp:"+5491140962202",free_shipping_threshold:60000,pickup_enabled:false},error:null})})})};
    if(table==="whatsapp_order_requests")return {select:()=>({eq:()=>({maybeSingle:priorRead})}),upsert:insert};
    throw Error("Tabla inesperada: "+table);
   })
  } as unknown as ReturnType<typeof privilegedDb>);
 });
 it("guarda solicitud con importe fijado en el servidor y sin cobrar",async()=>{
  const res=await POST(make());
  expect(res.status).toBe(201);
  const data=await res.json();
  expect(data.reference).toBe("VIA-111111112222");
  expect(data.whatsapp_url).toContain("https://wa.me/5491140962202?text=");
  expect(decodeURIComponent(data.whatsapp_url)).toContain("43.800");
  expect(data.status).toBe("draft");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({subtotal:43800,customer_name:"Ana Gomez"}),expect.objectContaining({ignoreDuplicates:true}));
  expect(rpc).toHaveBeenCalledWith("consume_checkout_attempt",expect.objectContaining({p_limit:8}));
 });
 it("reintentar una solicitud existente usa su fotografía comercial original aunque cambie el catálogo",async()=>{
  const oldSnapshot={
   id,status:"contacted",request_fingerprint:fingerprint(payload),
   customer_name:payload.customer_name,locality:payload.locality,address:payload.address,
   notes:payload.notes,shipping_method:payload.shipping_method,subtotal:12000,
   items:[{id:"catalog-price-2",name:"Palitos guardados",sku:"VIA-OLD",presentation:"Caja x36",price:6000,quantity:2}]
  };
  priorRead.mockResolvedValue({data:oldSnapshot,error:null});
  const res=await POST(make());
  expect(res.status).toBe(200);
  const result=await res.json();
  const message=decodeURIComponent(result.whatsapp_url);
  expect(result.subtotal).toBe(12000);
  expect(result.status).toBe("contacted");
  expect(message).toContain("Palitos guardados");
  expect(message).toContain("12.000");
  expect(message).not.toContain("43.800");
  expect(insert).not.toHaveBeenCalled();
 });
 it("bloquea reabrir una solicitud gestionada para que no parezca una orden nueva",async()=>{
  priorRead.mockResolvedValue({data:{id,status:"delivered",request_fingerprint:fingerprint(payload)},error:null});
  const res=await POST(make());
  expect(res.status).toBe(409);
  expect((await res.json()).code).toBe("REQUEST_ALREADY_HANDLED");
  expect(insert).not.toHaveBeenCalled();
 });
 it("un mismo identificador con datos diferentes devuelve conflicto",async()=>{
  priorRead.mockResolvedValue({data:{id,status:"draft",request_fingerprint:"b".repeat(64)},error:null});
  expect((await POST(make())).status).toBe(409);
  expect(insert).not.toHaveBeenCalled();
 });
 it("rechaza origen ajeno, artículos repetidos y carrito inválido antes de escribir",async()=>{
  expect((await POST(make(payload,{origin:"https://evil.example"}))).status).toBe(403);
  expect((await POST(make({...payload,items:[payload.items[0],payload.items[0]]}))).status).toBe(400);
  expect((await POST(make({...payload,items:[{id:"catalog-price-47",quantity:1}]}))).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
 });
 it("no registra si la base está sin conectar",async()=>{
  vi.mocked(connected).mockReturnValue(false);
  expect((await POST(make())).status).toBe(503);
  expect(insert).not.toHaveBeenCalled();
 });
});
