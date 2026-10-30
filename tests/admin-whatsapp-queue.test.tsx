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
 subtotal:20000,created_at:"2026-10-29T12:00:00Z",items:[{id:"sku-1",name:"Palitos de agua",sku:"PAL-001",presentation:"Caja",price:20000,quantity:1}],
 whatsapp_request_payments:[]
} as unknown as WhatsAppRequest;
describe("bandeja de solicitudes WhatsApp",()=>{
 it("filtra pendientes y busca por SKU sin perder las solicitudes",async()=>{
  const user=userEvent.setup();
  const requests=[
   {...base,status:"draft" as const},
   {...base,id:"22222222-2222-4333-8444-555555555555",customer_name:"Juan",status:"delivered" as const}
  ] as WhatsAppRequest[];
  render(<WhatsAppRequests requests={requests}/>);
  expect(screen.getByText("Para seguir")).toBeInTheDocument();
  expect(screen.getByText("Entregados")).toBeInTheDocument();
  expect(screen.getByText("2 de 2 solicitudes recientes")).toBeInTheDocument();
  await user.click(screen.getByLabelText("Solo pedidos pendientes"));
  expect(screen.getByText("1 de 2 solicitudes recientes")).toBeInTheDocument();
  await user.type(screen.getByRole("searchbox",{name:"Buscar referencia o cliente"}),"PAL-001");
  expect(screen.getByText("1 de 2 solicitudes recientes")).toBeInTheDocument();
  await user.clear(screen.getByRole("searchbox",{name:"Buscar referencia o cliente"}));
  await user.type(screen.getByRole("searchbox",{name:"Buscar referencia o cliente"}),"sin coincidencia");
  expect(screen.getByText(/No hay pedidos con esos filtros/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Limpiar filtros"}));
  expect(screen.getByText("2 de 2 solicitudes recientes")).toBeInTheDocument();
 });
});
