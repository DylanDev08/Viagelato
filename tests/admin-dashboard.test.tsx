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
  expect(screen.getByRole("status")).toHaveTextContent("Ficha provisional preparada como borrador");
  expect(screen.getByLabelText("Nombre")).not.toHaveValue("");
  expect(screen.getByLabelText("Precio ARS")).toHaveValue(0);
  expect(screen.getByLabelText("Stock confirmado")).toHaveValue(0);
  expect(screen.getByLabelText("Publicar producto")).not.toBeChecked();
 });
 it("muestra estadísticas y estados vacíos navegables",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard initialProducts={[]} initialCategories={[]} initialOrders={[]} initialZones={[]} initialSettings={DEFAULT_SETTINGS} initialBanners={[]}/>);
  expect(screen.getByText("Bienvenido a tu tienda")).toBeInTheDocument();
  expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(screen.getByText("Agregá tu primer producto.")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Pedidos"}));
  expect(screen.getByText("No hay pedidos todavía.")).toBeInTheDocument();
 });
});
