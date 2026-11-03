import {createRef} from "react";
import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {AdminOverview} from "@/components/admin-overview";
import {AdminProductRemovalDialog} from "@/components/admin-product-removal-dialog";
import type {Product} from "@/lib/types";

const item:Product={id:"00000000-0000-4000-8000-000000000005",name:"Helado prueba",slug:"helado-prueba",
 description:"",price:1000,stock:3,image_url:null,category_id:null,active:true,featured:false};
describe("panel modular: resumen y confirmación de productos",()=>{
 it("muestra el resumen de solicitudes y deriva navegación sin exponer otros módulos",async()=>{
  const user=userEvent.setup(),onNavigate=vi.fn();
  render(<AdminOverview counts={{attention:4,payment:2}} products={[item]} requestsLoaded={10} busy={false} onNavigate={onNavigate}/>);
  expect(screen.getByText("WhatsApp por atender").nextElementSibling).toHaveTextContent("4");
  expect(screen.getByText("Solicitudes con saldo").nextElementSibling).toHaveTextContent("2");
  expect(screen.getByText("Productos publicados").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText("Stock bajo (≤5)").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText(/últimas 10 solicitudes cargadas/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Administrar productos"}));
  expect(onNavigate).toHaveBeenCalledWith("products");
 });
 it("bloquea la eliminación definitiva hasta la aceptación explícita",async()=>{
  const user=userEvent.setup(),onSubmit=vi.fn(),onConfirmPermanentChange=vi.fn(),onClose=vi.fn();
  const props={removal:{product:item,mode:"delete" as const},dialogRef:createRef<HTMLElement>(),
   busy:false,onConfirmPermanentChange,onClose,onSubmit,error:""};
  const {rerender}=render(<AdminProductRemovalDialog {...props} confirmPermanent={false}/>);
  const dialog=screen.getByRole("alertdialog",{name:"Eliminar producto definitivamente"});
  const deleteButton=within(dialog).getByRole("button",{name:"Eliminar definitivamente"});
  expect(deleteButton).toBeDisabled();
  await user.click(deleteButton);
  expect(onSubmit).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("checkbox",{name:/Entiendo que se eliminará/}));
  expect(onConfirmPermanentChange).toHaveBeenCalledWith(true);
  rerender(<AdminProductRemovalDialog {...props} confirmPermanent={true}/>);
  await user.click(deleteButton);
  expect(onSubmit).toHaveBeenCalledTimes(1);
  await user.click(within(dialog).getByRole("button",{name:"Cancelar"}));
  expect(onClose).toHaveBeenCalledOnce();
 });
 it("la acción Ocultar no exige segunda casilla pero sí confirmación de botón",async()=>{
  const user=userEvent.setup(),onSubmit=vi.fn();
  render(<AdminProductRemovalDialog removal={{product:item,mode:"hide"}} dialogRef={createRef<HTMLElement>()}
   busy={false} confirmPermanent={false} onConfirmPermanentChange={vi.fn()} onClose={vi.fn()} onSubmit={onSubmit} error=""/>);
  const dialog=screen.getByRole("alertdialog",{name:"Ocultar producto"});
  expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole("button",{name:"Ocultar de la tienda"}));
  expect(onSubmit).toHaveBeenCalledOnce();
 });
});
