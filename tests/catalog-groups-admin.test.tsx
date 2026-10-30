import {render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {groupCatalogByType,storefrontSamples,categoryCatalogHref,CATALOG_TYPES} from "@/lib/catalog-groups";
import {draftFromPricedCatalog} from "@/lib/catalog-product-draft";
import {PricedCatalog} from "@/components/priced-catalog";
import {CartProvider} from "@/components/cart";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:{signOut:vi.fn()}})}));
const props={initialProducts:[],initialCategories:[],initialOrders:[],initialZones:[],initialSettings:DEFAULT_SETTINGS,initialBanners:[]};

describe("catálogo comercial agrupado",()=>{
 it("mantiene las 45 fichas sin duplicar precios, y agrupa por los 6 tipos reales",()=>{
  const groups=groupCatalogByType(CATALOG_PRICE_ITEMS);
  expect(groups.map(group=>group.name)).toEqual(CATALOG_TYPES);
  expect(groups.reduce((total,group)=>total+group.count,0)).toBe(45);
  expect(groups.flatMap(group=>group.items.map(item=>item.sourceRow))).toHaveLength(45);
  expect(storefrontSamples(CATALOG_PRICE_ITEMS,4)).toHaveLength(4);
  expect(new Set(storefrontSamples(CATALOG_PRICE_ITEMS,4).map(item=>item.category)).size).toBe(4);
  expect(categoryCatalogHref(groups[0].name)).toContain("tipo=");
 });
 it("el catálogo muestra secciones por tipo y puede abrir una categoría desde la home",async()=>{
  const user=userEvent.setup();
  render(<CartProvider><PricedCatalog items={CATALOG_PRICE_ITEMS.slice(0,10)} initialCategory="Palitos y conos"/></CartProvider>);
  expect(screen.getByRole("region",{name:"Productos: Palitos y conos"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Palitos y conos"})).toHaveAttribute("aria-pressed","true");
  await user.click(screen.getByRole("button",{name:"Todos los tipos"}));
  expect(screen.getByRole("button",{name:"Todos los tipos"})).toHaveAttribute("aria-pressed","true");
 });
 it("la portada compacta muestra cuatro productos en una única grilla",()=>{
  const chosen=storefrontSamples(CATALOG_PRICE_ITEMS,4);
  const {container}=render(<CartProvider><PricedCatalog items={chosen} compact/></CartProvider>);
  expect(container.querySelectorAll(".priced-grid")).toHaveLength(1);
  expect(container.querySelectorAll(".priced-card")).toHaveLength(4);
  expect(container.querySelector(".catalog-type-heading")).toBeNull();
 });
 it("las fichas de catálogo pasan a formulario sin inventar stock ni publicar",()=>{
  const item=CATALOG_PRICE_ITEMS[0];
  const draft=draftFromPricedCatalog(item,[]);
  expect(draft).toMatchObject({
   name:item.name,description:item.description,sku:item.sku,
   price:item.price,stock:0,image_url:item.image,active:false,
   commercially_verified:false,category_id:null
  });
  expect(draft.slug).toContain("via-");
 });
 it("el admin permite seleccionar un producto existente para prellenar la ficha",async()=>{
  const user=userEvent.setup();
  render(<AdminDashboard {...props}/>);
  await user.click(screen.getByRole("button",{name:"Productos"}));
  await user.click(screen.getByRole("button",{name:"Cargar desde catálogo"}));
  const picker=screen.getByRole("region",{name:"Productos del catálogo"});
  expect(within(picker).getByText(/45 opciones del catálogo/)).toBeInTheDocument();
  const item=CATALOG_PRICE_ITEMS[0];
  await user.click(within(picker).getByRole("button",{name:`Cargar ${item.name}`}));
  expect(screen.getByLabelText("Nombre del producto")).toHaveValue(item.name);
  expect(screen.getByLabelText("Precio de venta (ARS)")).toHaveValue(item.price);
  expect(screen.getByLabelText("Unidades disponibles")).toHaveValue(0);
  expect(screen.getByRole("button",{name:"Publicar en la tienda"})).toBeDisabled();
  expect(screen.getByText(/Para publicar falta/)).toBeInTheDocument();
 });
});
