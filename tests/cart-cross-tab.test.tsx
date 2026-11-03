import {act,render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it} from "vitest";
import {CartProvider,useCart} from "@/components/cart";

function CartProbe(){
 const {items,count,add,clear}=useCart();
 return <div><strong data-testid="count">{count}</strong><span data-testid="lines">{items.length}</span><button onClick={()=>add("catalog-price-2",1,99)}>Añadir</button><button onClick={clear}>Vaciar</button></div>;
}
beforeEach(()=>localStorage.clear());
describe("sincronización de carrito entre pestañas",()=>{
 it("actualiza cantidades y artículos cuando otra pestaña escribe en storage",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><CartProbe/></CartProvider>);
  await waitFor(()=>expect(screen.getByTestId("count")).toHaveTextContent("0"));
  await user.click(screen.getByRole("button",{name:"Añadir"}));
  expect(screen.getByTestId("count")).toHaveTextContent("1");
  const updated=JSON.stringify([{id:"catalog-price-2",quantity:3},{id:"catalog-price-3",quantity:2}]);
  act(()=>{
   localStorage.setItem("viagelato-cart:v1",updated);
   window.dispatchEvent(new StorageEvent("storage",{key:"viagelato-cart:v1",newValue:updated,storageArea:localStorage}));
  });
  await waitFor(()=>expect(screen.getByTestId("count")).toHaveTextContent("5"));
  expect(screen.getByTestId("lines")).toHaveTextContent("2");
 });
 it("sincroniza el vaciado remoto sin conservar unidades antiguas",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><CartProbe/></CartProvider>);
  await user.click(screen.getByRole("button",{name:"Añadir"}));
  await waitFor(()=>expect(screen.getByTestId("count")).toHaveTextContent("1"));
  act(()=>{
   localStorage.removeItem("viagelato-cart:v1");
   window.dispatchEvent(new StorageEvent("storage",{key:"viagelato-cart:v1",newValue:null,storageArea:localStorage}));
  });
  await waitFor(()=>expect(screen.getByTestId("count")).toHaveTextContent("0"));
 });
});
