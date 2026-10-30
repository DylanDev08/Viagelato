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
  await user.click(screen.getByText("Usar otra fotografía del catálogo"));
  await user.click(screen.getByRole("button",{name:"Elegir foto"}));
  expect(screen.getByRole("region",{name:"Imágenes candidatas"})).toBeInTheDocument();
  const picker=screen.getByRole("region",{name:"Imágenes candidatas"});
  expect(picker.querySelectorAll(".admin-candidate-card").length).toBeGreaterThan(0);
  const first=picker.querySelector("button.admin-candidate-card") as HTMLButtonElement;
  await user.click(first);
  expect(screen.getByText(/Ficha provisional preparada como borrador/)).toBeInTheDocument();
  expect(screen.getByLabelText("Nombre del producto")).not.toHaveValue("");
  expect(screen.getByLabelText("Precio de venta (ARS)")).toHaveValue(0);
  expect(screen.getByLabelText("Unidades disponibles")).toHaveValue(0);
  expect(screen.getByRole("button",{name:"Publicar en la tienda"})).toBeDisabled();
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
  await user.click(screen.getByRole("button",{name:"Datos de la tienda"}));
  await user.type(screen.getByLabelText("Nombre comercial")," Nuevo");
  expect(screen.getByText(/Hay cambios en la configuración/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByText(/Hay cambios en la configuración/)).toBeInTheDocument();
 });

 it("guarda un producto nuevo como borrador sin publicarlo",async()=>{
  const user=userEvent.setup();
  const id="00000000-0000-4000-8000-000000000007";
  const mockedFetch=vi.fn().mockImplementation(async (_url:string,options:{body:string})=>({ok:true,json:async()=>({...JSON.parse(options.body),id})}));
  vi.stubGlobal("fetch",mockedFetch);
  try{
   render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Productos"}));
   await user.type(screen.getByLabelText("Nombre del producto"),"Helado nuevo");
   expect(screen.getByText(/Podés guardar ahora y completar los datos antes de publicar/)).toBeInTheDocument();
   await user.click(screen.getByRole("button",{name:"Guardar borrador"}));
   await screen.findByText("Borrador guardado. Podés seguir editándolo.");
   expect(mockedFetch).toHaveBeenCalledOnce();
   const [url,opts]=mockedFetch.mock.calls[0];
   const body=JSON.parse(opts.body);
   expect(url).toBe("/api/admin/products");
   expect(opts.method).toBe("POST");
   expect(body).toMatchObject({name:"Helado nuevo",slug:"helado-nuevo",active:false});
   expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Helado nuevo");
   expect(screen.getByRole("heading",{name:"Editar producto"})).toBeInTheDocument();
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
   await screen.findByText("Borrador guardado. Podés seguir editándolo.");
   expect(mockedFetch).toHaveBeenCalledOnce();
   const [,opts]=mockedFetch.mock.calls[0];
   expect(opts.method).toBe("PATCH");
   expect(JSON.parse(opts.body).id).toBe(id);
   expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Vainilla cremosa");
   expect(screen.queryByText("Tenés cambios sin guardar en esta ficha.")).not.toBeInTheDocument();
  }finally{vi.unstubAllGlobals();}
 });

 it("publica de forma explícita una ficha completa sin hacerlo al guardar borradores",async()=>{
  const user=userEvent.setup();
  const product={
   id:"00000000-0000-4000-8000-000000000021",name:"Postre helado",slug:"postre-helado",
   description:"Postre helado en caja de varias unidades para distribuir.",
   price:32000,stock:5,image_url:"/catalogo/alfajor-negro.webp",
   category_id:null,sku:"POS-021",presentation:"Caja",
   active:false,featured:false,commercially_verified:true,catalog_visible:false
  };
  const mockedFetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({...product,active:true})});
  vi.stubGlobal("fetch",mockedFetch);
  try{
   render(<AdminDashboard initialProducts={[product]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Productos"}));
   await user.click(screen.getByRole("button",{name:"Editar"}));
   const publish=screen.getByRole("button",{name:"Publicar en la tienda"});
   expect(publish).toBeEnabled();
   await user.click(publish);
   await screen.findByText("Producto publicado correctamente");
   expect(mockedFetch).toHaveBeenCalledOnce();
   const [url,options]=mockedFetch.mock.calls[0];
   expect(url).toBe("/api/admin/products");
   expect(options.method).toBe("PATCH");
   expect(JSON.parse(options.body)).toMatchObject({id:product.id,active:true,catalog_visible:false});
   expect(screen.getByText("Estado actual: Publicado en la tienda")).toBeInTheDocument();
  }finally{vi.unstubAllGlobals();}
 });
 it("no informa guardado exitoso si el servidor devuelve precios o stock distintos",async()=>{
  const user=userEvent.setup();
  const id="00000000-0000-4000-8000-000000000031";
  const product={id,name:"Helado chocolate",slug:"helado-chocolate",description:"",price:100,stock:2,image_url:null,
   category_id:null,sku:null,presentation:null,active:false,featured:false,commercially_verified:false,catalog_visible:false};
  const mockedFetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({...product,price:100})});
  vi.stubGlobal("fetch",mockedFetch);
  try{
   render(<AdminDashboard initialProducts={[product]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Productos"}));
   await user.click(screen.getByRole("button",{name:"Editar"}));
   await user.clear(screen.getByRole("spinbutton",{name:"Precio de venta (ARS)"}));
   await user.type(screen.getByRole("spinbutton",{name:"Precio de venta (ARS)"}),"150");
   await user.click(screen.getByRole("button",{name:"Guardar cambios"}));
   expect(await screen.findByRole("alert")).toHaveTextContent(/no confirmó precio, stock, foto y visibilidad/);
   expect(screen.getByText(/Tenés cambios sin guardar/)).toBeInTheDocument();
  }finally{vi.unstubAllGlobals();}
 });
 it("al ocultar la ficha que se está editando también actualiza el estado del editor",async()=>{
  const user=userEvent.setup();
  const id="00000000-0000-4000-8000-000000000032";
  const product={id,name:"Helado frutilla",slug:"helado-frutilla",description:"Producto con stock confirmado para distribuir.",
   price:1000,stock:3,image_url:"/catalogo/helado.webp",category_id:null,sku:"FRU-01",presentation:"Caja",
   active:true,featured:false,commercially_verified:true,catalog_visible:false};
  const mockedFetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})});
  vi.stubGlobal("fetch",mockedFetch);
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(true);
  try{
   render(<AdminDashboard initialProducts={[product]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Productos"}));
   await user.click(screen.getByRole("button",{name:"Editar"}));
   await user.click(screen.getByRole("button",{name:"Ocultar"}));
   expect(confirm).toHaveBeenCalled();
   await screen.findByText("Producto oculto correctamente");
   expect(screen.getByText("Estado actual: Borrador oculto")).toBeInTheDocument();
   expect(screen.queryByText("Tenés cambios sin guardar en esta ficha.")).not.toBeInTheDocument();
   expect(JSON.parse(mockedFetch.mock.calls[0][1].body)).toEqual({id});
   expect(mockedFetch.mock.calls[0][1].method).toBe("DELETE");
  }finally{confirm.mockRestore();vi.unstubAllGlobals();}
 });
 it("mantiene el enlace de una categoría al corregir su nombre",async()=>{
  const user=userEvent.setup();
  const category={id:"00000000-0000-4000-8000-000000000017",name:"Postres helados",slug:"postres-helados"};
  render(<AdminDashboard initialProducts={[]} initialCategories={[category]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  await user.click(screen.getByRole("button",{name:"Categorías"}));
  await user.click(screen.getByRole("button",{name:"Editar"}));
  const field=screen.getByLabelText("Nombre");
  await user.clear(field);await user.type(field,"Postres y helados");
  await user.click(screen.getByText("Editar la dirección de la categoría (opcional)"));
  expect(screen.getByLabelText(/Dirección de la categoría/)).toHaveValue("postres-helados");
 });
 it("permite avanzar un pedido con un botón claro sin ejecutar pagos",async()=>{
  const user=userEvent.setup();
  const id="00000000-0000-4000-8000-000000000018";
  const order={
   id,customer_name:"Ana",customer_email:"ana@example.com",customer_phone:"1122334455",
   address:"",shipping_method:"pickup",shipping_cost:0,total:3000,status:"new",
   payment_status:"pending" as const,payment_method:"on_delivery" as const,
   created_at:"2026-10-28T12:00:00Z",order_items:[]
  };
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({updated:true})});
  vi.stubGlobal("fetch",fetchMock);
  try{
   render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[order]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
   await user.click(screen.getByRole("button",{name:"Pedidos online"}));
   expect(screen.getByText("Nuevo")).toBeInTheDocument();
   await user.click(screen.getByRole("button",{name:"Preparar pedido"}));
   await screen.findByText("Estado del pedido actualizado");
   expect(fetchMock).toHaveBeenCalledOnce();
   const [url,options]=fetchMock.mock.calls[0];
   expect(url).toBe("/api/admin/orders");
   expect(JSON.parse(options.body)).toEqual({id,action:"set_status",status:"preparing"});
  }finally{vi.unstubAllGlobals();}
 });
 it("muestra estadísticas y estados vacíos navegables",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  expect(screen.getByText("¿Qué necesitás hacer hoy?")).toBeInTheDocument();
  expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(screen.getByText("Agregá tu primer producto.")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Pedidos online"}));
  expect(screen.getByText(/No hay pedidos todavía/)).toBeInTheDocument();
 });
});
