import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,it,expect} from "vitest";
import {Checkout} from "@/components/checkout";
import {CartProvider} from "@/components/cart";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("localidades habilitadas y fuera de cobertura",()=>{
 it("incluye Capital Federal y ofrece la preferencia de pago",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Capital Federal");
  expect(screen.queryByText(/Capital Federal: consultamos cobertura, costo y fecha de entrega/)).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox",{name:"Escribí tu localidad"})).not.toBeInTheDocument();
  await user.click(screen.getByRole("radio",{name:/Efectivo al recibir/}));
  expect(screen.getByRole("radio",{name:/Efectivo al recibir/})).toBeChecked();
 });
 it("permite escribir localidad real sin enviar literalmente 'Otra localidad'",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><Checkout products={[]} zones={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  const select=screen.getByLabelText("Zona de entrega");
  await user.selectOptions(select,"other");
  const locality=screen.getByRole("textbox",{name:"Escribí tu localidad"});
  await user.type(locality,"Quilmes Oeste");
  expect(locality).toHaveValue("Quilmes Oeste");
  expect(screen.getByText(/Fuera de las zonas habilitadas, consultamos cobertura, costo y fecha/)).toBeInTheDocument();
  await user.selectOptions(select,"Lanús Este");
  expect(screen.queryByRole("textbox",{name:"Escribí tu localidad"})).not.toBeInTheDocument();
 });
});
