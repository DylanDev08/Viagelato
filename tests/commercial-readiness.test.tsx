import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {AdminOverview} from "@/components/admin-overview";
import {commercialReadiness} from "@/lib/commercial-readiness";
import type {Product,ShippingZone} from "@/lib/types";

const product=(fields:Partial<Product>):Product=>({
 id:"00000000-0000-4000-8000-000000000001",slug:"excel-fila-2",
 name:"Helado de prueba",description:"",price:21900,stock:0,
 sku:"SKU-01",presentation:"Caja",image_url:null,category_id:null,
 active:false,commercially_verified:false,catalog_visible:true,featured:false,...fields
} as Product);
const zone=(fields:Partial<ShippingZone>):ShippingZone=>({
 id:"00000000-0000-4000-8000-000000000003",name:"Temperley",
 postal_codes:[],cost:null,active:false,ready:false,free_shipping_eligible:true,
 ...fields
});

describe("preparación comercial sin promesas de stock ni envío",()=>{
 it("distingue presentaciones visibles de publicaciones verificadas",()=>{
  const values=commercialReadiness([
   product({stock:0}),product({id:"00000000-0000-4000-8000-000000000002",stock:12,commercially_verified:true,active:true}),
   product({id:"00000000-0000-4000-8000-000000000004",stock:0,catalog_visible:false})
  ],[]);
  expect(values).toMatchObject({
   visibleForInquiry:2,awaitingVerification:1,withoutConfirmedStock:1,
   published:1,areasWithConfirmedTariff:0,commercialAreas:15
  });
 });
 it("cuenta tarifas solo cuando la zona comercial está activa, lista y tiene costo real",()=>{
  const values=commercialReadiness([],
   [zone({cost:3500,active:true,ready:true}),
    zone({name:"Lanús Este",cost:0,active:true,ready:true}),
    zone({name:"Banfield",cost:null,active:false,ready:false}),
    zone({name:"Rosario",cost:2500,active:true,ready:true})]);
  expect(values.areasWithConfirmedTariff).toBe(2);
 });
 it("muestra los pendientes al administrador y navega a sus módulos",async()=>{
  const onNavigate=vi.fn();
  const user=userEvent.setup();
  render(<AdminOverview counts={{attention:0,payment:0}} products={[product({stock:0})]} zones={[]} requestsLoaded={0} busy={false} onNavigate={onNavigate}/>);
  const section=screen.getByRole("region",{name:"Preparación comercial"});
  expect(section).toHaveTextContent("Visibles para consulta");
  expect(section).toHaveTextContent("Sin stock confirmado");
  expect(section).toHaveTextContent("Envío bajo el mínimo");
  expect(section).toHaveTextContent("Se cotiza manualmente");
  await user.click(screen.getByRole("button",{name:"Revisar productos"}));
  await user.click(screen.getByRole("button",{name:"Ver zonas de entrega"}));
  expect(onNavigate).toHaveBeenNthCalledWith(1,"products");
  expect(onNavigate).toHaveBeenNthCalledWith(2,"zones");
 });
});
