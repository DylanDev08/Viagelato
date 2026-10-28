import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:{signOut:vi.fn()}})}));

describe("panel administrativo",()=>{
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
