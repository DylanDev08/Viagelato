import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {WhatsAppRequests} from "@/components/admin-whatsapp-requests";
import type {WhatsAppRequest} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
const sample={
 id:"11111111-2222-4333-8444-555555555555",customer_name:"Prueba",
 locality:"Lanús",address:"",notes:"",shipping_method:"pickup",stock_confirmed:false,
 shipping_cost:0,total:null,amount_paid:0,payment_status:"pending",subtotal:20000,
 created_at:"2026-11-03T12:00:00Z",updated_at:"2026-11-03T12:00:00Z",
 status:"draft",items:[{id:"sku-1",name:"Helado",price:20000,quantity:1}],
 whatsapp_request_payments:[]
} as WhatsAppRequest;
describe("paginación visual de WhatsApp",()=>{
 it("muestra un botón de carga incremental y no altera los pagos",async()=>{
  const user=userEvent.setup(),loadMore=vi.fn();
  render(<WhatsAppRequests requests={[sample]} hasMore onLoadMore={loadMore} />);
  expect(screen.getByText(/solicitudes cargadas por páginas/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Cargar 20 solicitudes anteriores"}));
  expect(loadMore).toHaveBeenCalledOnce();
 });
 it("bloquea carga doble mientras llega una página",()=>{
  render(<WhatsAppRequests requests={[sample]} hasMore loadingMore />);
  expect(screen.getByRole("button",{name:"Cargando…"})).toBeDisabled();
 });
 it("presenta error sin filtrar datos técnicos",()=>{
  render(<WhatsAppRequests requests={[sample]} hasMore loadError="No se pudieron cargar más pedidos." />);
  expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar más pedidos.");
 });
});
