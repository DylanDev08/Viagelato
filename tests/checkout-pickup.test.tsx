import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it} from "vitest";
import {CartProvider,useCart} from "@/components/cart";
import {Checkout} from "@/components/checkout";
import {DEFAULT_SETTINGS} from "@/lib/types";

function AddFixture(){
 const {add}=useCart();
 return <button type="button" onClick={()=>add("catalog-price-2",1,99)}>Agregar caja</button>;
}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});

describe("retiro en el local de Viagelato",()=>{
 it("no exige zona de entrega, muestra la dirección y no suma envío aunque no alcance $60.000",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><AddFixture/><Checkout products={[]} zones={[]}
   settings={{...DEFAULT_SETTINGS,pickup_enabled:true}} demo={false} checkoutEnabled={false}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Agregar caja"}));
  await user.selectOptions(screen.getByLabelText("Tipo de entrega"),"pickup");
  expect(screen.queryByLabelText("Zona de entrega")).not.toBeInTheDocument();
  expect(screen.getByText(/Retiro en el local, sin cargo/)).toBeInTheDocument();
  expect(screen.getByText(/Dirección: Eva Perón 3050/)).toBeInTheDocument();
  const summary=screen.getByRole("region",{name:"Resumen y total del pedido"});
  expect(within(summary).getByText("Retiro en local")).toBeInTheDocument();
  expect(within(summary).getByText("Sin envío")).toBeInTheDocument();
  expect(summary.querySelector(".cart-price-total strong")).toHaveTextContent("21.900");
  await user.type(screen.getByLabelText("Nombre y apellido"),"Ana Gómez");
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeEnabled();
 });
 it("al volver a envío exige elegir una localidad y recalcula el costo",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><AddFixture/><Checkout products={[]} zones={[]}
   settings={{...DEFAULT_SETTINGS,pickup_enabled:true}} demo={false} checkoutEnabled={false}/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Agregar caja"}));
  await user.type(screen.getByLabelText("Nombre y apellido"),"Ana Gómez");
  await user.selectOptions(screen.getByLabelText("Tipo de entrega"),"pickup");
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeEnabled();
  await user.selectOptions(screen.getByLabelText("Tipo de entrega"),"shipping");
  expect(screen.getByLabelText("Zona de entrega")).toBeRequired();
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeDisabled();
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Capital Federal");
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeEnabled();
  expect(screen.getByRole("region",{name:"Resumen y total del pedido"}).querySelector(".cart-price-total strong")).toHaveTextContent("81.900");
 });
});
