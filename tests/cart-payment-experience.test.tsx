import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {CartProvider} from "@/components/cart";
import {Checkout} from "@/components/checkout";
import {DEFAULT_SETTINGS} from "@/lib/types";

beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
describe("experiencia del carrito rediseñado",()=>{
 it("muestra pasos comerciales sin carteles de preproducción",()=>{
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  expect(screen.getByRole("list",{name:"Cómo hacer el pedido"})).toBeInTheDocument();
  expect(screen.queryByText("Sin pago online")).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeDisabled();
  expect(screen.getByRole("radio",{name:/Transferencia bancaria/})).toBeChecked();
 });
 it("la elección de efectivo cambia el mensaje sin activar pagos automáticos",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  await user.click(screen.getByRole("radio",{name:/Efectivo al recibir/}));
  expect(screen.getByRole("radio",{name:/Efectivo al recibir/})).toBeChecked();
  expect(screen.getByText("Efectivo al recibir")).toBeInTheDocument();
 });
 it("pedir vaciar carrito necesita una confirmación",async()=>{
  localStorage.setItem("viagelato-cart:v1",JSON.stringify([{id:"catalog-price-2",quantity:1}]));
  const user=userEvent.setup();
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
  try{
   render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
   const clear=await screen.findByRole("button",{name:"Vaciar carrito"});
   await user.click(clear);
   expect(confirm).toHaveBeenCalledOnce();
   expect(screen.getByText("Productos seleccionados")).toBeInTheDocument();
   expect(screen.getByRole("button",{name:"Vaciar carrito"})).toBeInTheDocument();
   expect(screen.getByRole("link",{name:/Continuar con el pedido/})).toHaveAttribute("href","#datos-pedido");
   expect(screen.queryByRole("region",{name:"Importe de productos"})).not.toBeInTheDocument();
   confirm.mockReturnValue(true);
   await user.click(clear);
   await waitFor(()=>expect(screen.queryByRole("button",{name:"Vaciar carrito"})).not.toBeInTheDocument());
  }finally{confirm.mockRestore();}
 });
});
