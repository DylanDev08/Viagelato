import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,describe,expect,it,vi} from "vitest";
import {WhatsAppRequests} from "@/components/admin-whatsapp-requests";
import type {WhatsAppRequest} from "@/lib/types";

const refresh=vi.fn();
vi.mock("next/navigation",()=>({useRouter:()=>({refresh})}));
const common:WhatsAppRequest={
 id:"11111111-2222-4333-8444-555555555555",
 customer_name:"Cliente Prueba",locality:"Lanús",address:"",notes:"",
 shipping_method:"shipping",items:[{id:"catalog-price-2",name:"Palitos",sku:"VIA-PAL-002-X36",price:21900,quantity:1}],
 subtotal:21900,stock_confirmed:false,shipping_cost:null,total:null,amount_paid:0,
 status:"contacted",payment_status:"pending",
 created_at:"2026-10-28T12:00:00Z",updated_at:"2026-10-28T12:00:00Z",
};
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();refresh.mockClear();});
describe("seguimiento comercial de WhatsApp",()=>{
 it("obliga a verificar el stock y cotizar el envío antes de confirmar",async()=>{
  const user=userEvent.setup();
  const send=vi.fn(async (_input:RequestInfo|URL,_init?:RequestInit)=>({ok:true,json:async()=>({updated:true})}));
  vi.stubGlobal("fetch",send);
  vi.spyOn(window,"confirm").mockReturnValue(true);
  render(<WhatsAppRequests requests={[common]}/>);
  expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Confirmar pedido"})).toBeDisabled();
  const save=screen.getByRole("button",{name:"Guardar stock y envío"});
  expect(save).toBeDisabled();
  await user.click(screen.getByRole("checkbox",{name:/Verifiqué que hay stock/}));
  await user.type(screen.getByRole("spinbutton",{name:/Costo de envío acordado/}),"3500");
  await user.click(save);
  expect(send).toHaveBeenCalledOnce();
  const [endpoint,options]=send.mock.calls[0];
  expect(endpoint).toBe("/api/admin/whatsapp-requests");
  expect(JSON.parse(String(options?.body))).toEqual({
   id:common.id,action:"confirm_terms",stock_confirmed:true,shipping_cost:3500
  });
 });
 it("aplica el costo cero de envío a zona elegible desde el umbral",async()=>{
  const user=userEvent.setup();
  const send=vi.fn(async (_input:RequestInfo|URL,_init?:RequestInit)=>({ok:true,json:async()=>({updated:true})}));
  vi.stubGlobal("fetch",send);
  vi.spyOn(window,"confirm").mockReturnValue(true);
  render(<WhatsAppRequests requests={[{...common,subtotal:65700,items:[{...common.items[0],quantity:3}]}]} freeShippingThreshold={60000}/>);
  expect(screen.getByText(/Envío gratuito por superar/)).toBeInTheDocument();
  const shipping=screen.getByRole("spinbutton",{name:/Costo de envío acordado/});
  expect(shipping).toBeDisabled();
  expect(shipping).toHaveValue(0);
  await user.click(screen.getByRole("checkbox",{name:/Verifiqué que hay stock/}));
  await user.click(screen.getByRole("button",{name:"Guardar stock y envío"}));
  expect(send).toHaveBeenCalledOnce();
  expect(JSON.parse(String(send.mock.calls[0]?.[1]?.body))).toMatchObject({
   action:"confirm_terms",stock_confirmed:true,shipping_cost:0
  });
 });
 it("no habilita preparación cuando falta acreditar saldo",()=>{
  render(<WhatsAppRequests requests={[{...common,status:"confirmed",stock_confirmed:true,shipping_cost:3500,total:25400,
   amount_paid:10000,payment_status:"partial",whatsapp_request_payments:[
    {id:"00000000-0000-4000-8000-000000000001",amount:10000,transfer_reference:"OP-1",created_at:common.created_at}
   ]}]}/>);
  expect(screen.getByRole("button",{name:"Preparar"})).toBeDisabled();
  expect(screen.getByText("Pago parcial registrado. El pedido no pasará a preparación hasta completar el saldo.")).toBeInTheDocument();
  expect(screen.getByText(/15.400/)).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Registrar importe recibido"})).toBeEnabled();
  expect(screen.getByText(/Ver pagos registrados/)).toBeInTheDocument();
 });
 it("permite preparar un pedido contra entrega, pero exige registrar efectivo antes de cerrarlo",async()=>{
  const user=userEvent.setup();
  const send=vi.fn(async (_input:RequestInfo|URL,_init?:RequestInit)=>({ok:true,json:async()=>({updated:true})}));
  vi.stubGlobal("fetch",send);
  vi.spyOn(window,"confirm").mockReturnValue(true);
  const order={...common,payment_preference:"cash_on_delivery" as const,status:"confirmed" as const,
   stock_confirmed:true,shipping_cost:3500,total:25400,amount_paid:0,payment_status:"pending" as const};
  const {rerender}=render(<WhatsAppRequests requests={[order]}/>);
  await user.click(screen.getByRole("button",{name:/Todos 1/}));
  expect(screen.getByText("Pago solicitado: Efectivo al recibir (a confirmar)")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Preparar"})).toBeEnabled();
  await user.click(screen.getByRole("button",{name:"Preparar"}));
  expect(JSON.parse(String(send.mock.calls[0][1]?.body))).toMatchObject({action:"preparing"});
  rerender(<WhatsAppRequests requests={[{...order,status:"shipped"}]}/>);
  expect(screen.getByRole("button",{name:"Marcar entregado"})).toBeDisabled();
  expect(screen.getByRole("button",{name:/Registrar efectivo recibido/})).toBeEnabled();
  await user.click(screen.getByRole("button",{name:/Registrar efectivo recibido/}));
  expect(JSON.parse(String(send.mock.calls[1][1]?.body))).toMatchObject({action:"record_cash",amount:25400});
  expect(JSON.parse(String(send.mock.calls[1][1]?.body)).payment_key).toMatch(/^[a-f0-9-]{36}$/);
 });
 it("envía importe, referencia e idempotencia sin marcar el total automáticamente",async()=>{
  const user=userEvent.setup();
  const send=vi.fn(async (_input:RequestInfo|URL,_init?:RequestInit)=>({ok:true,json:async()=>({updated:true})}));
  vi.stubGlobal("fetch",send);
  vi.spyOn(window,"confirm").mockReturnValue(true);
  render(<WhatsAppRequests requests={[{...common,status:"confirmed",stock_confirmed:true,shipping_cost:3500,total:25400,amount_paid:10000,payment_status:"partial"}]}/>);
  await user.type(screen.getByRole("spinbutton",{name:/Importe recibido/}),"15400");
  await user.type(screen.getByRole("textbox",{name:/Referencia bancaria/}),"OP-2");
  await user.click(screen.getByRole("button",{name:"Registrar importe recibido"}));
  expect(send).toHaveBeenCalledOnce();
  const payload=JSON.parse(String(send.mock.calls[0]?.[1]?.body));
  expect(payload).toMatchObject({action:"record_payment",amount:15400,transfer_reference:"OP-2"});
  expect(payload.payment_key).toMatch(/^[a-f0-9-]{36}$/);
  expect(refresh).toHaveBeenCalledOnce();
 });
});
