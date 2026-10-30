import {afterEach,describe,expect,it,vi} from "vitest";
import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {DailyWhatsAppSummary} from "@/components/admin-whatsapp-daily-summary";

afterEach(()=>vi.unstubAllGlobals());
describe("resumen diario administrativo",()=>{
 it("consulta bajo demanda y diferencia pedidos de cobros",async()=>{
  const user=userEvent.setup();
  const fetchMock=vi.fn(async()=>({ok:true,json:async()=>({
   day:"2026-10-30",prepared_count:8,confirmed_count:3,confirmed_amount:70000,
   transfer_received:20000,cash_received:15000,outstanding_amount:35000
  })}));
  vi.stubGlobal("fetch",fetchMock);
  render(<DailyWhatsAppSummary/>);
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button",{name:"Consultar resumen"}));
  expect(await screen.findByText("Pedidos confirmados (sin cancelados)")).toBeInTheDocument();
  expect(screen.getByText("Efectivo recibido ese día")).toBeInTheDocument();
  expect(screen.getByText("Transferencias recibidas ese día")).toBeInTheDocument();
  expect(screen.getByText("Mensajes preparados")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledOnce();
 });
 it("muestra error sin inventar importes cuando falta migración",async()=>{
  const user=userEvent.setup();
  vi.stubGlobal("fetch",vi.fn(async()=>({ok:false,json:async()=>({error:"Falta migración"})})));
  render(<DailyWhatsAppSummary/>);
  await user.click(screen.getByRole("button",{name:"Consultar resumen"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Falta migración");
  expect(screen.queryByText("Importe de esos pedidos")).not.toBeInTheDocument();
 });
});
