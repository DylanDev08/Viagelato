import {describe,expect,it} from "vitest";
import {productData,organizationData,catalogProductData} from "@/lib/structured-data";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {serializeJsonLd} from "@/lib/seo";
import {DEFAULT_SETTINGS,type Product} from "@/lib/types";
const product:Product={id:"test",name:"Helado",slug:"helado",price:12.5,stock:0,description:"Descripción",image_url:null,category_id:null,active:true,commercially_verified:true};
describe("datos estructurados comerciales",()=>{
 it("usa precios vigentes sin inventar disponibilidad ni reseñas",()=>{
  const data=productData(product,"https://example.com");
  expect(data["@graph"][0]).toMatchObject({"@type":"Product",offers:{price:"12.50",priceCurrency:"ARS"}});
  const json=serializeJsonLd(data);
  expect(json).not.toMatch(/availability|rating|review|image/);
  expect(data["@graph"][1]).toMatchObject({"@type":"BreadcrumbList"});
 });
 it("omite ofertas sin precio o sin verificación comercial",()=>{
  for(const item of [{...product,price:0},{...product,commercially_verified:false}])
   expect(productData(item,"https://example.com")["@graph"][0]).not.toHaveProperty("offers");
 });
 it("genera fichas catalogables con precio verificado sin inventar stock",()=>{
  const item=CATALOG_PRICE_ITEMS[0];
  const data=catalogProductData(item,"https://viagelato.example");
  expect(data["@graph"][0]).toMatchObject({
   "@type":"Product",sku:item.sku,
   offers:{price:item.price.toFixed(2),priceCurrency:"ARS",url:`https://viagelato.example/catalogo/vista/${item.id}`},
  });
  const content=serializeJsonLd(data);
  expect(content).not.toContain("availability");
  expect(content).not.toContain("aggregateRating");
 });
 it("escapa cadenas capaces de cerrar script",()=>{
  const text=serializeJsonLd({name:'</script><script>alert(1)</script>'});
  expect(text).not.toContain("<");expect(JSON.parse(text).name).toContain("</script>");
 });
 it("no inventa sucursales ni direcciones para Organization",()=>{
  expect(organizationData(DEFAULT_SETTINGS,"https://example.com")).not.toHaveProperty("address");
 });
});
