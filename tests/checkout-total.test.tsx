import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it} from "vitest";
import {CartProvider,useCart} from "@/components/cart";
import {Checkout} from "@/components/checkout";
import {DEFAULT_SETTINGS,type ShippingZone} from "@/lib/types";

function AddFixture(){
 const {add}=useCart();
 return <button type="button" onClick={()=>add("catalog-price-2",1,99)}>Agregar presentación de prueba</button>;
}
const zone:ShippingZone={id:"11111111-2222-4333-8444-555555555555",name:"Lanús Este",
 postal_codes:[],cost:5000,active:true,ready:true,free_shipping_eligible:true};
function setup(zones:ShippingZone[]=[]){
 render(<CartProvider><AddFixture/><Checkout products={[]} zones={zones} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
 return screen.getByRole("region",{name:"Resumen y total del pedido"});
}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
describe("carrito con total y envío visible",()=>{
 it("calcula en vivo el subtotal, envío gratis y total exacto en zona incluida",async()=>{
  const user=userEvent.setup(),summary=setup();
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  expect(within(summary).getByText("Total de productos")).toBeInTheDocument();
  expect(within(summary).getByText("A confirmar")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Lanús Este");
  expect(within(summary).getByText(/Todavía no hay una tarifa/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  expect(within(summary).getByText("Gratis")).toBeInTheDocument();
  expect(within(summary).getByText("Total del pedido")).toBeInTheDocument();
  expect(summary.querySelector(".cart-price-total strong")).toHaveTextContent("65.700");
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeDisabled();
 });
 it("muestra tarifa configurada y no la confunde con subtotal",async()=>{
  const user=userEvent.setup(),summary=setup([zone]);
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Lanús Este");
  expect(within(summary).getByText("Total del pedido")).toBeInTheDocument();
  expect(summary.querySelector(".cart-price-total strong")).toHaveTextContent("26.900");
  expect(within(summary).getByText(/5.000/)).toBeInTheDocument();
 });
 it("Capital Federal obtiene envío gratis cuando supera el mínimo",async()=>{
  const user=userEvent.setup(),summary=setup();
  for(let i=0;i<3;i++)await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Capital Federal");
  expect(within(summary).getByText("Total del pedido")).toBeInTheDocument();
  expect(summary.querySelector(".cart-price-total strong")).toHaveTextContent("65.700");
  expect(within(summary).getByText("Gratis")).toBeInTheDocument();
  expect(screen.queryByText(/Capital Federal: consultamos cobertura/)).not.toBeInTheDocument();
 });
 it("al elegir localidad fuera de zonas deja el envío sin cotizar",async()=>{
  const user=userEvent.setup(),summary=setup();
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"other");
  await user.type(screen.getByRole("textbox",{name:"Escribí tu localidad"}),"Quilmes Oeste");
  expect(within(summary).getByText("Total de productos")).toBeInTheDocument();
  expect(summary.querySelectorAll(".cart-price-row strong")[1]).toHaveTextContent("A confirmar");
  expect(summary.querySelector(".cart-price-total strong")).toHaveTextContent("21.900");
  await user.type(screen.getByLabelText("Nombre y apellido"),"Ana Gomez");
  expect(screen.getByRole("button",{name:"Pagar por WhatsApp"})).toBeEnabled();
 });
 it("muestra cuánto falta para obtener envío gratis solo en las zonas elegibles",async()=>{
  const user=userEvent.setup();setup();
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  const benefit=screen.getByRole("region",{name:"Beneficio de envío gratis"});
  expect(benefit).toHaveTextContent(/Elegí tu zona/);
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Lanús Este");
  expect(benefit).toHaveTextContent("38.100");
  expect(screen.getByRole("progressbar",{name:"Progreso para envío gratis"})).toHaveAttribute("aria-valuenow","37");
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  await user.click(screen.getByRole("button",{name:"Agregar presentación de prueba"}));
  expect(benefit).toHaveTextContent(/Tu compra tiene envío gratis/);
  expect(screen.queryByRole("progressbar",{name:"Progreso para envío gratis"})).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Zona de entrega"),"Capital Federal");
  expect(benefit).toHaveTextContent(/Tu compra tiene envío gratis/);
  expect(benefit).not.toHaveTextContent("38.100");
 });
});
