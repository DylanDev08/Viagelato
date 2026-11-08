import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,describe,expect,it,vi} from "vitest";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:{signOut:vi.fn()}})}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const props={initialCategories:[],initialOrders:[],initialZones:[],initialSettings:DEFAULT_SETTINGS,initialBanners:[]};
const draft={id:"00000000-0000-4000-8000-000000000099",name:"Producto de prueba",slug:"producto-prueba",description:"",price:0,stock:0,image_url:null,category_id:null,sku:null,presentation:null,active:false,catalog_visible:false,featured:false,commercially_verified:false};

describe("productos: editor y eliminación en ventanas emergentes",()=>{
 it("la lista abre modales de creación o edición, no un formulario permanente",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard {...props} initialProducts={[draft]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"+ Nuevo producto"}));
  expect(screen.getByRole("dialog",{name:"Agregar producto"})).toHaveAttribute("aria-modal","true");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Editar"}));
  expect(screen.getByRole("dialog",{name:"Editar producto"})).toBeInTheDocument();
  expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Producto de prueba");
  await user.click(screen.getByRole("button",{name:"Cerrar ventana de producto"}));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
 });
 it("no descarta ediciones al cerrar Escape sin confirmación",async()=>{
  const user=userEvent.setup();
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
  render(<AdminDashboard {...props} initialProducts={[]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.click(screen.getByRole("button",{name:"+ Nuevo producto"}));
  await user.type(screen.getByLabelText("Nombre del producto"),"Helado nuevo");
  await user.keyboard("{Escape}");
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByRole("dialog",{name:"Agregar producto"})).toBeInTheDocument();
  confirm.mockReturnValue(true);
  await user.click(screen.getByRole("button",{name:"Cerrar ventana de producto"}));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
 });
 it("exige confirmación antes de borrar permanentemente y envía acción explícita",async()=>{
  const user=userEvent.setup();
  const fetchMock=vi.fn().mockResolvedValue({status:200,ok:true,json:async()=>({ok:true,deleted:true})});
  vi.stubGlobal("fetch",fetchMock);
  render(<AdminDashboard {...props} initialProducts={[draft]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.click(screen.getByRole("button",{name:"Eliminar"}));
  const dlg=screen.getByRole("alertdialog",{name:"Eliminar producto definitivamente"});
  expect(within(dlg).getByRole("button",{name:"Eliminar definitivamente"})).toBeDisabled();
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(within(dlg).getByRole("checkbox",{name:/Entiendo que se eliminará/}));
  await user.click(within(dlg).getByRole("button",{name:"Eliminar definitivamente"}));
  expect(await screen.findByText("Producto eliminado definitivamente")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({id:draft.id,action:"delete_permanently"});
 });
 it("conserva la confirmación y explica un bloqueo de borrado por historial",async()=>{
  const user=userEvent.setup();
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({status:409,ok:false,json:async()=>({error:"Este producto tiene pedidos asociados."})}));
  render(<AdminDashboard {...props} initialProducts={[draft]}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.click(screen.getByRole("button",{name:"Eliminar"}));
  const dlg=screen.getByRole("alertdialog",{name:"Eliminar producto definitivamente"});
  await user.click(within(dlg).getByRole("checkbox",{name:/Entiendo que se eliminará/}));
  await user.click(within(dlg).getByRole("button",{name:"Eliminar definitivamente"}));
  expect(await within(dlg).findByRole("alert")).toHaveTextContent("pedidos asociados");
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
 });
});
