import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:{signOut:vi.fn()}})}));

describe("panel administrativo",()=>{
 it("permite buscar productos por nombre y SKU con acentos ignorados",async()=>{
  const user=userEvent.setup();
  const product={id:"00000000-0000-4000-8000-000000000001",name:"Helado de limón",slug:"helado-limon",description:"",price:1200,stock:3,image_url:null,category_id:null,sku:"LIM-01",active:false,featured:false,commercially_verified:false};
  render(<AdminDashboard initialProducts={[product]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.type(screen.getByRole("searchbox",{name:"Buscar producto o SKU"}),"LIMON");
  expect(screen.getByText("Helado de limón")).toBeInTheDocument();
  await user.clear(screen.getByRole("searchbox",{name:"Buscar producto o SKU"}));
  await user.type(screen.getByRole("searchbox",{name:"Buscar producto o SKU"}),"sin coincidencia");
  expect(screen.getByText(/No se encontraron productos con esos filtros/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Limpiar filtros"}));
  expect(screen.getByText("Helado de limón")).toBeInTheDocument();
 });
 it("permite elegir un candidato sin publicar ni completar datos ficticios",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.click(screen.getByRole("button",{name:"Elegir imagen del catálogo provisional"}));
  expect(screen.getByRole("region",{name:"Imágenes candidatas"})).toBeInTheDocument();
  const picker=screen.getByRole("region",{name:"Imágenes candidatas"});
  expect(picker.querySelectorAll(".admin-candidate-card").length).toBeGreaterThan(0);
  const first=picker.querySelector("button.admin-candidate-card") as HTMLButtonElement;
  await user.click(first);
  expect(screen.getByText(/Ficha provisional preparada como borrador/)).toBeInTheDocument();
  expect(screen.getByLabelText("Nombre del producto")).not.toHaveValue("");
  expect(screen.getByLabelText("Precio de venta (ARS)")).toHaveValue(0);
  expect(screen.getByLabelText("Unidades disponibles")).toHaveValue(0);
  expect(screen.getByLabelText("Mostrar este producto en la tienda")).not.toBeChecked();
 });

 it("protege una ficha de producto sin guardar antes de cambiar de módulo",async()=>{
  const user=userEvent.setup();
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
  render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.type(screen.getByLabelText("Nombre del producto"),"Chocolate");
  expect(screen.getByText(/Tenés cambios sin guardar/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Categorías"}));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByText(/Tenés cambios sin guardar/)).toBeInTheDocument();
  confirm.mockReturnValue(true);
  await user.click(screen.getByRole("button",{name:"Categorías"}));
  expect(screen.getByRole("heading",{name:"Categorías",level:1})).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(screen.getByLabelText("Nombre del producto")).toHaveValue("");
 });
 it("avisa antes de perder cambios en la configuración",async()=>{
  const user=userEvent.setup();
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
  render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  await user.click(screen.getByRole("button",{name:"Configuración"}));
  await user.type(screen.getByLabelText("Nombre comercial")," Nuevo");
  expect(screen.getByText(/Hay cambios en la configuración/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByText(/Hay cambios en la configuración/)).toBeInTheDocument();
 });

 it("guarda un producto nuevo como borrador sin publicarlo",async()=>{
  const user=userEvent.setup();
  const id="00000000-0000-4000-8000-000000000007";
  const mockedFetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({id,name:"Helado nuevo",active:false})});
  vi.stubGlobal("fetch",mockedFetch);
  try{
   render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Productos"}));
   await user.type(screen.getByLabelText("Nombre del producto"),"Helado nuevo");
   expect(screen.getByText(/Al guardar, seguirá como borrador/)).toBeInTheDocument();
   await user.click(screen.getByRole("button",{name:"Guardar borrador"}));
   await screen.findByText("Borrador creado correctamente");
   expect(mockedFetch).toHaveBeenCalledOnce();
   const [url,opts]=mockedFetch.mock.calls[0];
   const body=JSON.parse(opts.body);
   expect(url).toBe("/api/admin/products");
   expect(opts.method).toBe("POST");
   expect(body).toMatchObject({name:"Helado nuevo",slug:"helado-nuevo",active:false});
   expect(screen.getByLabelText("Nombre del producto")).toHaveValue("");
  }finally{vi.unstubAllGlobals();}
 });
 it("después de guardar una edición conserva el producto abierto",async()=>{
  const user=userEvent.setup();
  const id="00000000-0000-4000-8000-000000000008";
  const product={id,name:"Vainilla",slug:"vainilla",description:"",price:0,stock:0,image_url:null,category_id:null,sku:null,presentation:null,active:false,featured:false,commercially_verified:false};
  const mockedFetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({...product,name:"Vainilla cremosa"})});
  vi.stubGlobal("fetch",mockedFetch);
  try{
   render(<AdminDashboard initialProducts={[product]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Productos"}));
   await user.click(screen.getByRole("button",{name:"Editar"}));
   await user.clear(screen.getByLabelText("Nombre del producto"));
   await user.type(screen.getByLabelText("Nombre del producto"),"Vainilla cremosa");
   await user.click(screen.getByRole("button",{name:"Guardar cambios"}));
   await screen.findByText("Producto actualizado correctamente");
   expect(mockedFetch).toHaveBeenCalledOnce();
   const [,opts]=mockedFetch.mock.calls[0];
   expect(opts.method).toBe("PATCH");
   expect(JSON.parse(opts.body).id).toBe(id);
   expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Vainilla cremosa");
   expect(screen.queryByText("Tenés cambios sin guardar en esta ficha.")).not.toBeInTheDocument();
  }finally{vi.unstubAllGlobals();}
 });
 it("muestra estadísticas y estados vacíos navegables",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  expect(screen.getByText("Tu tienda, en un solo lugar")).toBeInTheDocument();
  expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(screen.getByText("Agregá tu primer producto.")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Pedidos"}));
  expect(screen.getByText(/No hay pedidos todavía/)).toBeInTheDocument();
 });
});
