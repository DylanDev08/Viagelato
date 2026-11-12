import {readFileSync} from "node:fs";
import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {settingsSchema} from "@/lib/admin-rules";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS,type ShippingZone} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:{signOut:vi.fn()}})}));

const {id:_id,...defaultSettings}=DEFAULT_SETTINGS;
void _id;
const zone=(name:string,active=false,cost:number|null=null):ShippingZone=>({
 id:name==="Temperley"?"11111111-2222-4333-8444-555555555555":"22222222-3333-4444-8555-666666666666",
 name,postal_codes:[],cost,active,ready:active,free_shipping_eligible:true
});

describe("configuración vigente de portada",()=>{
 it("permite guardar la foto interna exacta de Sei Tu sin borrar el hero",()=>{
  const result=settingsSchema.safeParse({...defaultSettings,hero_image_url:"/catalogo/hero-seitu-tentate.webp"});
  expect(result.success).toBe(true);
 });
 it("rechaza rutas de recorrido, JavaScript y URLs inseguras en el hero",()=>{
  for(const image of ["/catalogo/../secret.webp","//dominio-ajeno/imagen.webp","javascript:alert(1)","http://ejemplo.com/foto.jpg"]){
   expect(settingsSchema.safeParse({...defaultSettings,hero_image_url:image}).success).toBe(false);
  }
 });
});

describe("zonas comerciales: edición y responsive",()=>{
 const base={initialProducts:[],initialCategories:[],initialOrders:[],initialBanners:[],initialSettings:DEFAULT_SETTINGS};
 it("muestra pendientes por defecto, permite filtrar y editar una tarifa sin inventarla",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard {...base} initialZones={[zone("Temperley"),zone("Lomas de Zamora",true,3500)]}/>);
  await user.click(screen.getByRole("button",{name:"Zonas de envío"}));
  const panel=screen.getByRole("heading",{name:"Configurar zona de entrega"}).closest(".panel") as HTMLElement;
  expect(within(panel).getByRole("combobox",{name:"Filtrar zonas por estado"})).toHaveValue("pending");
  expect(within(panel).getByText("Temperley")).toBeInTheDocument();
  expect(within(panel).queryByText("Lomas de Zamora")).not.toBeInTheDocument();
  await user.click(within(panel).getByRole("button",{name:"Editar zona Temperley"}));
  expect(within(panel).getByRole("textbox",{name:"Zona o barrio"})).toHaveValue("Temperley");
  expect(within(panel).getByRole("textbox",{name:"Zona o barrio"})).toHaveFocus();
  expect(within(panel).getByRole("button",{name:"Guardar zona"})).toBeInTheDocument();
  expect(within(panel).getByRole("button",{name:"Desactivar tarifa"})).toBeDisabled();
  await user.selectOptions(within(panel).getByRole("combobox",{name:"Filtrar zonas por estado"}),"active");
  expect(within(panel).getByText("Lomas de Zamora")).toBeInTheDocument();
  expect(within(panel).queryByText("Temperley")).not.toBeInTheDocument();
  await user.click(within(panel).getByRole("button",{name:"Cancelar edición"}));
  expect(within(panel).getByRole("textbox",{name:"Zona o barrio"})).toHaveValue("");
 });
 it("usa botones táctiles, formulario y filtros adaptados sin romper el diseño anterior",()=>{
  const css=readFileSync("src/app/admin-zones-responsive.css","utf8");
  const layout=readFileSync("src/app/layout.tsx","utf8");
  expect(css).toContain("@media(max-width:1120px)");
  expect(css).toContain("@media(max-width:760px)");
  expect(css).toContain("@media(max-width:360px)");
  expect(css).toContain("min-height:44px");
  expect(css).toContain("font-size:16px");
  expect(layout.indexOf('import "./admin-zones-responsive.css";')).toBeGreaterThan(layout.indexOf('import "./admin-mobile-access.css";'));
 });
});
