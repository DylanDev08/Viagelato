import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,describe,expect,it,vi} from "vitest";
import {CartProvider} from "@/components/cart";
import {Checkout} from "@/components/checkout";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("@/lib/checkout-idempotency",async importOriginal=>({
 ...await importOriginal<typeof import("@/lib/checkout-idempotency")>(),
 checkoutRequestFingerprint:async()=>"a".repeat(64),
}));
afterEach(()=>vi.unstubAllGlobals());
describe("mensaje preparado y selección vigente",()=>{
 it("bloquea edición mientras prepara e invalida el vínculo después de editar",async()=>{
  localStorage.clear();sessionStorage.clear();
  localStorage.setItem("viagelato-cart:v1",JSON.stringify([{id:"catalog-price-2",quantity:1}]));
  let finish!:(value:Response)=>void;
  const send=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));
  vi.stubGlobal("fetch",send);
  const user=userEvent.setup();
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  await user.type(screen.getByLabelText("Nombre y apellido"),"Ana Gomez");
  await user.selectOptions(screen.getByLabelText("Localidad"),"Lanús");
  await user.click(screen.getByRole("button",{name:/Preparar pedido en WhatsApp/}));
  await waitFor(()=>expect(send).toHaveBeenCalledOnce());
  expect(screen.getByLabelText("Nombre y apellido")).toBeDisabled();
  expect(screen.getByRole("button",{name:/Vaciar carrito/})).toBeDisabled();
  finish(Response.json({reference:"VIA-TEST",whatsapp_url:"https://wa.me/5491140962202?text=test",subtotal:21900},{status:201}));
  expect(await screen.findByRole("link",{name:"Abrir WhatsApp para enviar el mensaje"})).toBeInTheDocument();
  await user.type(screen.getByLabelText("Nombre y apellido")," editado");
  expect(screen.queryByRole("link",{name:"Abrir WhatsApp para enviar el mensaje"})).not.toBeInTheDocument();
 });
});
