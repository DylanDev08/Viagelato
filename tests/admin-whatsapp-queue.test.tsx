import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,it,expect,vi} from "vitest";
import {WhatsAppRequests} from "@/components/admin-whatsapp-requests";
import type {WhatsAppRequest} from "@/lib/types";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
const base={
 id:"11111111-2222-4333-8444-555555555555",customer_name:"Ana Gomez",locality:"Lanús",
 address:"Calle 123",notes:"",shipping_method:"shipping",stock_confirmed:false,
 shipping_cost:null,total:null,amount_paid:0,payment_status:"pending",
 subtotal:20000,created_at:"2026-10-29T12:00:00Z",updated_at:"2026-10-29T12:00:00Z",
 items:[{id:"sku-1",name:"Palitos de agua",sku:"PAL-001",presentation:"Caja",price:20000,quantity:1}],
 whatsapp_request_payments:[]
} as unknown as WhatsAppRequest;
describe("bandeja administrativa de WhatsApp",()=>{
 it("inicia en atención y permite ver finalizados y buscar por SKU",async()=>{
  const user=userEvent.setup();
  const requests=[
   {...base,status:"draft" as const},
   {...base,id:"22222222-2222-4333-8444-555555555555",customer_name:"Juan",status:"delivered" as const,payment_status:"paid" as const,total:20000,amount_paid:20000}
  ] as WhatsAppRequest[];
  render(<WhatsAppRequests requests={requests}/>);
  expect(screen.getByRole("button",{name:/Necesitan atención 1/})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:/Finalizados 1/})).toBeInTheDocument();
  expect(screen.getByText("1 resultados · 2 solicitudes recientes cargadas (máximo 100)")).toBeInTheDocument();
  expect(screen.getByText(/El cliente preparó el mensaje/)).toBeInTheDocument();
  expect(screen.getByText("Ana Gomez")).toBeInTheDocument();
  expect(screen.queryByText("Juan")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:/Finalizados 1/}));
  expect(screen.getByText("Juan")).toBeInTheDocument();
  expect(screen.queryByText("Ana Gomez")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:/Todos 2/}));
  expect(screen.getByText("Ana Gomez")).toBeInTheDocument();
  expect(screen.getByText("Juan")).toBeInTheDocument();
  await user.type(screen.getByRole("searchbox",{name:"Buscar un pedido"}),"PAL-001");
  expect(screen.getByText("2 resultados · 2 solicitudes recientes cargadas (máximo 100)")).toBeInTheDocument();
  await user.clear(screen.getByRole("searchbox",{name:"Buscar un pedido"}));
  await user.type(screen.getByRole("searchbox",{name:"Buscar un pedido"}),"sin coincidencia");
  expect(screen.getByText(/No encontramos pedidos con esa búsqueda/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Mostrar todos"}));
  expect(screen.getByText("2 resultados · 2 solicitudes recientes cargadas (máximo 100)")).toBeInTheDocument();
 });
 it("permite inspeccionar productos y pagos sin desplegar toda la ficha",async()=>{
  const user=userEvent.setup();
  render(<WhatsAppRequests requests={[{...base,status:"contacted",payment_preference:"cash_on_delivery"} as WhatsAppRequest]}/>);
  const summary=screen.getByText("Productos y datos de entrega (1 producto)");
  expect(summary.closest("details")).not.toHaveAttribute("open");
  await user.click(summary);
  expect(summary.closest("details")).toHaveAttribute("open");
  expect(screen.getByText("Pago solicitado: Efectivo al recibir (a confirmar)")).toBeInTheDocument();
 });
});
