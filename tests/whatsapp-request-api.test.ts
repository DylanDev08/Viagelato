import {createHash} from "node:crypto";
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
function fingerprint(input:unknown){return createHash("sha256").update(JSON.stringify(input)).digest("hex");}

describe("registrar referencia WhatsApp",()=>{
 const rpc=vi.fn(async()=>({data:true,error:null}));
 const insert=vi.fn();
 const priorRead=vi.fn(async():Promise<{data:Record<string,unknown>|null;error:null}>=>({data:null,error:null}));
 const catalogRead=vi.fn(async()=>({data:[{slug:"excel-fila-2",name:"Palitos de agua",sku:"VIA-CAT-2",presentation:"Caja x24",price:21900}],error:null}));
 const productRead=vi.fn();
 const shippingRead=vi.fn(async():Promise<{data:Record<string,unknown>[]|null;error:{message:string}|null}>=>({data:[],error:null}));
 beforeEach(()=>{
  vi.clearAllMocks();vi.mocked(connected).mockReturnValue(true);
  process.env.SUPABASE_SERVICE_ROLE_KEY="abcdefghijklmnopqrstuvwxyz0123456789SERVICE";
  process.env.CHECKOUT_RATE_LIMIT_SALT="test-only-salt";
  rpc.mockResolvedValue({data:true,error:null});
  productRead.mockResolvedValue({data:[{id,name:"Helado",sku:"VIA-PUBLIC",presentation:"Caja",price:1200,stock:2}],error:null});
  priorRead.mockResolvedValue({data:null,error:null});
  catalogRead.mockResolvedValue({data:[{slug:"excel-fila-2",name:"Palitos de agua",sku:"VIA-CAT-2",presentation:"Caja x24",price:21900}],error:null});
  shippingRead.mockResolvedValue({data:[],error:null});
  insert.mockImplementation((input:Record<string,unknown>)=>{
   const record={...input,id,status:"draft"};
   return {select:()=>({maybeSingle:async()=>({data:record,error:null})})};
  });
  vi.mocked(privilegedDb).mockReturnValue({
   rpc,
   from:vi.fn((table:string)=>{
    if(table==="site_settings")return {select:()=>({eq:()=>({single:async()=>({data:{whatsapp:"+5491140962202",free_shipping_threshold:60000,pickup_enabled:false},error:null})})})};
    if(table==="shipping_zones")return {select:()=>({eq:()=>({eq:()=>({not:shippingRead})})})};
    if(table==="whatsapp_order_requests")return {select:()=>({eq:()=>({maybeSingle:priorRead})}),upsert:insert};
    if(table==="products")return {select:()=>({eq:()=>({in:catalogRead}),in:()=>({eq:()=>({eq:()=>({gt:productRead})})})})};
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
  expect(data.shipping_cost).toBeNull();
  expect(data.total).toBeNull();
  expect(decodeURIComponent(data.whatsapp_url)).toContain("Total de productos");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({subtotal:43800,customer_name:"Ana Gomez"}),expect.objectContaining({ignoreDuplicates:true}));
  expect(rpc).toHaveBeenCalledWith("consume_checkout_attempt",expect.objectContaining({p_limit:8}));
 });
 it("toma el precio del servidor, aunque la planilla histórica sea diferente",async()=>{
  catalogRead.mockResolvedValue({data:[{slug:"excel-fila-2",name:"Palitos de agua",sku:"VIA-CAT-2",presentation:"Caja x24",price:32500}],error:null});
  const res=await POST(make());
  expect(res.status).toBe(201);
  const quote=await res.json();
  expect(quote.subtotal).toBe(65000);
  expect(quote.shipping_cost).toBe(0);
  expect(quote.total).toBe(65000);
  expect(decodeURIComponent(quote.whatsapp_url)).toContain("Envío: gratis");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({subtotal:65000}),expect.anything());
 });
 it("calcula del lado servidor una tarifa vigente sin tomar la del cliente",async()=>{
  shippingRead.mockResolvedValue({data:[{name:"Lanús",cost:4800,active:true,ready:true,free_shipping_eligible:true}],error:null});
  const response=await POST(make());
  expect(response.status).toBe(201);
  const data=await response.json();
  expect(data.shipping_cost).toBe(4800);
  expect(data.total).toBe(48600);
  expect(decodeURIComponent(data.whatsapp_url)).toContain("48.600");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({subtotal:43800}),expect.anything());
 });
 it("para una localidad fuera de cobertura no inventa una tarifa",async()=>{
  const response=await POST(make({...payload,locality:"Quilmes Oeste"}));
  const data=await response.json();
  expect(response.status).toBe(201);
  expect(data.shipping_cost).toBeNull();
  expect(data.total).toBeNull();
  expect(decodeURIComponent(data.whatsapp_url)).toContain("Total final con envío: a confirmar");
 });
 it("no confirma importes de envío cuando no puede verificar las tarifas",async()=>{
  shippingRead.mockResolvedValue({data:null,error:{message:"temporarily unavailable"}});
  const response=await POST(make());
  expect(response.status).toBe(503);
  expect(insert).not.toHaveBeenCalled();
 });
 it("rechaza precio obsoleto sin registrar un pedido, incluso con WhatsApp configurado",async()=>{
  catalogRead.mockResolvedValue({data:[{slug:"excel-fila-2",name:"Palitos de agua",sku:"VIA-CAT-2",presentation:"Caja x24",price:32500}],error:null});
  const res=await POST(make({...payload,expected_subtotal:43800}));
  expect(res.status).toBe(409);
  expect((await res.json()).error).toMatch(/precios cambiaron/i);
  expect(insert).not.toHaveBeenCalled();
 });
 it("rechaza un producto oculto y no escribe solicitudes",async()=>{
  catalogRead.mockResolvedValue({data:[],error:null});
  const res=await POST(make());
  expect(res.status).toBe(409);
  expect(insert).not.toHaveBeenCalled();
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
 it("rechaza stock agotado y cantidades superiores al stock de productos publicados",async()=>{
  for(const stock of [0,1]){
   productRead.mockResolvedValue({data:[{id,name:"Helado",price:1200,stock}],error:null});
   expect((await POST(make({...payload,items:[{id,quantity:2}]}))).status).toBe(409);
  }
  expect(insert).not.toHaveBeenCalled();
 });
 it("acepta cantidades disponibles sin reservar stock",async()=>{
  const response=await POST(make({...payload,items:[{id,quantity:2}]}));
  expect(response.status).toBe(201);expect((await response.json()).subtotal).toBe(2400);
  expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_checkout_attempt",expect.anything());
 });
 it("responde JSON seguro cuando falla la red de Supabase",async()=>{
  rpc.mockRejectedValueOnce(new Error("private backend detail"));
  const response=await POST(make());
  expect(response.status).toBe(503);expect(await response.text()).not.toContain("private backend detail");
  expect(response.headers.get("cache-control")).toBe("no-store");
 });
 it("rechaza falta de origen y exceso de cuerpo antes de consultar la base",async()=>{
  const noOrigin=make();noOrigin.headers.delete("origin");
  expect((await POST(noOrigin)).status).toBe(403);
  expect((await POST(make({...payload,notes:"ñ".repeat(9000)}))).status).toBe(413);
  expect(rpc).not.toHaveBeenCalled();
 });
 it("suma importes en centavos para no crear diferencias por flotantes",async()=>{
  catalogRead.mockResolvedValue({data:[{slug:"excel-fila-2",name:"Helado",sku:"TEST",presentation:"Caja",price:0.1}],error:null});
  const response=await POST(make({...payload,items:[{id:"catalog-price-2",quantity:3}],expected_subtotal:0.3}));
  expect(response.status).toBe(201);expect((await response.json()).subtotal).toBe(0.3);
 });
});
