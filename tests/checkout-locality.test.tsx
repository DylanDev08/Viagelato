import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,it,expect} from "vitest";
import {Checkout} from "@/components/checkout";
import {CartProvider} from "@/components/cart";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("localidades fuera de la cobertura predefinida",()=>{
 it("separa Capital Federal y ofrece la preferencia de pago",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Capital Federal");
  expect(screen.getByText(/Capital Federal: envío fuera de zona con tarifa fija/)).toBeInTheDocument();
  expect(screen.queryByRole("textbox",{name:"Escribí tu localidad"})).not.toBeInTheDocument();
  await user.click(screen.getByRole("radio",{name:/Efectivo al recibir/}));
  expect(screen.getByText("Efectivo al recibir, sujeto a confirmación")).toBeInTheDocument();
 });
 it("permite escribir localidad real sin enviar literalmente 'Otra localidad'",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  const select=screen.getByLabelText("Zona de entrega");
  await user.selectOptions(select,"other");
  const locality=screen.getByRole("textbox",{name:"Escribí tu localidad"});
  await user.type(locality,"Quilmes Oeste");
  expect(locality).toHaveValue("Quilmes Oeste");
  expect(screen.getByText(/Fuera de las zonas habilitadas, el envío tiene una tarifa fija/)).toBeInTheDocument();
  await user.selectOptions(select,"Lanús");
  expect(screen.queryByRole("textbox",{name:"Escribí tu localidad"})).not.toBeInTheDocument();
 });
});
