import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it} from "vitest";
import {CartProvider,useCart} from "@/components/cart";
import {ProductCard} from "@/components/product-card";
import {Checkout} from "@/components/checkout";
import {DEFAULT_SETTINGS,type Product} from "@/lib/types";
const product:Product={id:"10000000-0000-4000-8000-000000000001",name:"Helado",slug:"helado",stock:1,price:1200,description:"Helado de prueba",image_url:null,category_id:null,active:true,commercially_verified:true};
beforeEach(()=>localStorage.clear());
function CartProbe(){const {items,setQuantity}=useCart();return <><output data-testid="quantity">{items[0]?.quantity??0}</output><button onClick={()=>setQuantity(product.id,NaN)}>NaN</button><button onClick={()=>setQuantity(product.id,1.9)}>Decimal</button></>;}
describe("stock administrado y cantidades del carrito",()=>{
 it("no permite agregar por encima del stock vigente",async()=>{
  const user=userEvent.setup();render(<CartProvider><ProductCard product={product}/><CartProbe/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Agregar Helado al carrito"}));
  expect(screen.getByTestId("quantity")).toHaveTextContent("1");
  expect(screen.getByRole("button",{name:"Se alcanzó el stock disponible de Helado"})).toBeDisabled();
  await user.click(screen.getByText("NaN"));await user.click(screen.getByText("Decimal"));
  expect(screen.getByTestId("quantity")).toHaveTextContent("1");
 });
 it("bloquea el pedido si el stock bajó después de guardar el carrito",async()=>{
  localStorage.setItem("viagelato-cart:v1",JSON.stringify([{id:product.id,quantity:2}]));
  render(<CartProvider><Checkout products={[product]} zones={[]} catalogItems={[]} settings={DEFAULT_SETTINGS} demo={false} checkoutEnabled={false}/></CartProvider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("superan el stock");
  expect(screen.getByRole("button",{name:/Pagar por WhatsApp/})).toBeDisabled();
 });
 it("no ofrece agregar un producto sin stock",()=>{
  render(<CartProvider><ProductCard product={{...product,stock:0}}/></CartProvider>);
  expect(screen.getByText("Sin stock disponible")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:/Se alcanzó/})).toBeDisabled();
 });
});
