import {readFileSync} from "node:fs";
import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi,afterEach} from "vitest";
import {CartProvider} from "@/components/cart";
import {SiteHeader} from "@/components/site-header";
import {SiteFooter} from "@/components/site-footer";
import {AdminDashboard} from "@/components/admin-dashboard";
import Login from "@/app/login/page";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:{signOut:vi.fn()}})}));
afterEach(()=>vi.restoreAllMocks());
const props={initialProducts:[],initialCategories:[],initialOrders:[],initialZones:[],initialSettings:DEFAULT_SETTINGS,initialBanners:[]};

describe("entrada de administración desde celular",()=>{
 it("incluye un acceso directo en el menú móvil y lo cierra al entrar",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><SiteHeader settings={DEFAULT_SETTINGS}/></CartProvider>);
  const overlay=document.getElementById("mobile-navigation") as HTMLElement;
  expect(within(overlay).getByText("Acceso administración")).toHaveAttribute("href","/admin");
  expect(within(overlay).getByText("Acceso administración")).toHaveAttribute("tabindex","-1");
  await user.click(screen.getByRole("button",{name:"Abrir menú"}));
  await user.click(within(overlay).getByRole("link",{name:"Acceso administración"}));
  expect(overlay).toHaveAttribute("aria-hidden","true");
 });
 it("deja un acceso alternativo en el pie sin saltarse la autenticación",()=>{
  render(<SiteFooter settings={DEFAULT_SETTINGS}/>);
  expect(screen.getByRole("link",{name:"Acceso administración"})).toHaveAttribute("href","/admin");
 });
 it("el login muestra la contraseña solo tras pedirlo",async()=>{
  const user=userEvent.setup();
  render(<Login/>);
  const input=screen.getByLabelText("Contraseña") as HTMLInputElement;
  expect(input).toHaveAttribute("type","password");
  await user.click(screen.getByRole("button",{name:"Mostrar contraseña"}));
  expect(input).toHaveAttribute("type","text");
  await user.click(screen.getByRole("button",{name:"Ocultar contraseña"}));
  expect(input).toHaveAttribute("type","password");
 });
});

describe("menú rápido administrativo",()=>{
 it("permite abrir Productos y WhatsApp en un toque",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard {...props}/>);
  const bar=screen.getByRole("navigation",{name:"Accesos rápidos de administración"});
  await user.click(within(bar).getByRole("button",{name:"Acceso rápido: Productos"}));
  expect(screen.getByRole("heading",{name:"Productos",level:1})).toBeInTheDocument();
  await user.click(within(bar).getByRole("button",{name:"Acceso rápido: Pedidos por WhatsApp"}));
  expect(screen.getByRole("heading",{name:"Pedidos por WhatsApp",level:1})).toBeInTheDocument();
 });
 it("Más expone los otros módulos y se cierra al elegir uno",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard {...props}/>);
  const more=screen.getByRole("button",{name:"Más módulos administrativos"});
  expect(more).toHaveAttribute("aria-expanded","false");
  await user.click(more);
  expect(more).toHaveAttribute("aria-expanded","true");
  await user.click(screen.getByRole("button",{name:"Ir a Zonas de envío"}));
  expect(screen.getByRole("heading",{name:"Zonas de envío",level:1})).toBeInTheDocument();
  expect(more).toHaveAttribute("aria-expanded","false");
 });
 it("Escape cierra los módulos secundarios sin cambiar la sección",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard {...props}/>);
  await user.click(screen.getByRole("button",{name:"Más módulos administrativos"}));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button",{name:"Más módulos administrativos"})).toHaveAttribute("aria-expanded","false");
  expect(screen.getByRole("heading",{name:"Resumen",level:1})).toBeInTheDocument();
 });
 it("conserva el aviso de cambios sin guardar al navegar por la barra",async()=>{
  const user=userEvent.setup();
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
  render(<AdminDashboard {...props}/>);
  await user.click(screen.getByRole("button",{name:"Acceso rápido: Productos"}));
  await user.type(screen.getByLabelText("Nombre del producto"),"Copa helada");
  await user.click(screen.getByRole("button",{name:"Acceso rápido: Pedidos online"}));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByRole("heading",{name:"Productos",level:1})).toBeInTheDocument();
 });
});

describe("estilos táctiles",()=>{
 it("la navegación admin se habilita solo en móvil y respeta safe-area",()=>{
  const css=readFileSync("src/app/admin-mobile-access.css","utf8");
  const layout=readFileSync("src/app/layout.tsx","utf8");
  expect(css).toContain("@media(max-width:760px)");
  expect(css).toContain(".admin-mobile-bottom-nav");
  expect(css).toContain(".admin-mobile-more.is-open");
  expect(css).toContain("env(safe-area-inset-bottom");
  expect(layout).toContain('import "./admin-mobile-access.css";');
 });
});
