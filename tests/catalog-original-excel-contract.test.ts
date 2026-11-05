import {existsSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";

/**
 * Fuente de referencia: PRODUCTOS Y PRECIOS(1).xlsx, Hoja1!A2:C46
 * Recibido por el cliente el 03/11/2026. No modificar importes ni tamaños
 * sin una nueva lista de precios o confirmación del comercio.
 */
const excelPrices=[
 21900,17900,17900,21900,21900,23900,19900,22900,22900,
 28900,30900,37900,31900,32900,45900,30900,27900,46900,
 46900,6900,7900,23900,23900,25900,32900,10900,10900,
 11900,12900,13900,13900,16900,13900,12900,12900,12900,
 12900,7900,7900,7900,6200,5900,14500,19900,45900
];
const excelPacks=[
 "36u","24u","24u","24u","24u","24u","24u","24u","20u",
 "24u","24u","24u","16u","16u","14u","14u","12u","8u",
 "8u","150g","150g","20u","20u","20u","24u","8u","8u",
 "8u","6u","8u","mini","8u","8u","800g","800g","800g",
 "800g","750cc","750cc","750cc","360cc","360cc","3L","5L","10L"
];
const row=(n:number)=>CATALOG_PRICE_ITEMS.find(x=>x.sourceRow===n)!;

function matchesPresentation(text:string,pack:string){
 if(pack==="mini")return /mini/i.test(text);
 if(pack.endsWith("cc"))return new RegExp(`\\b${parseInt(pack,10)} cc\\b`,"i").test(text);
 if(pack.endsWith("u"))return new RegExp(`\\b${parseInt(pack,10)} unidades\\b`,"i").test(text);
 if(pack.endsWith("g"))return new RegExp(`\\b${parseInt(pack,10)} g\\b`,"i").test(text);
 if(pack.endsWith("L"))return new RegExp(`\\b${parseInt(pack,10)} litros\\b`,"i").test(text);
 return false;
}

describe("contrato de la lista comercial original — 45 filas",()=>{
 it("preserva cada precio del Excel en orden de fila, sin desfasajes",()=>{
  expect(CATALOG_PRICE_ITEMS.map(x=>x.sourceRow)).toEqual(Array.from({length:45},(_,i)=>i+2));
  expect(CATALOG_PRICE_ITEMS.map(x=>x.price)).toEqual(excelPrices);
  expect(new Set(CATALOG_PRICE_ITEMS.map(x=>x.sku)).size).toBe(45);
 });
 it("preserva la unidad de venta: caja, pote, peso o litros; no vender sueltas",()=>{
  expect(excelPacks).toHaveLength(45);
  CATALOG_PRICE_ITEMS.forEach((x,i)=>
   expect(matchesPresentation(x.presentation,excelPacks[i]),
    `Fila del Excel ${x.sourceRow}: ${x.presentation} vs ${excelPacks[i]}`).toBe(true)
  );
 });
 it("conserva los sabores de la lista sin afirmar que vienen mezclados",()=>{
  expect(row(2).variants).toMatch(/limón, frutilla y uva/i);
  expect(row(8).variants).toMatch(/frutilla, americana y chocolate/i);
  expect(row(10).variants).toMatch(/frutilla-americana y chocolate-vainilla/i);
  expect(row(15).variants).toMatch(/almendras, blanco y cookies/i);
  expect(row(17).variants).toMatch(/americana y dulce de leche/i);
  expect(row(19).variants).toMatch(/americana, menta, dulce de leche y pistacho/i);
  expect(row(31).variants).toMatch(/clásico, nevado y pistacho/i);
  expect(row(34).variants).toMatch(/clásico.*nevado/i);
  expect(row(35).variants).toMatch(/frutilla y dulce de leche/i);
  expect(row(40).variants).toMatch(/súper chocolate.*crema-cookies/i);
  expect(row(46).variants).toMatch(/americana.*limón.*chocolate.*frutilla a la crema/i);
  for(const n of [2,8,10,19]){
   expect(row(n).name.toLowerCase()).not.toContain("surtidos");
   expect(row(n).description.toLowerCase()).not.toMatch(/caja surtida|surtido de.*una sola presentación/);
  }
 });
 it("vincula 44 referencias del Drive y respeta una imagen ilustrativa para lata 10 L",()=>{
  const ids=CATALOG_PRICE_ITEMS.map(x=>x.sourceDriveId).filter(Boolean);
  expect(ids).toHaveLength(44);
  expect(new Set(ids).size).toBe(44);
  expect(row(46).sourceDriveId).toBeNull();
  expect(row(46).imageStatus).toBe("referencial");
  for(const item of CATALOG_PRICE_ITEMS){
   expect(item.image).toBeTruthy();
   expect(existsSync(join(process.cwd(),"public",item.image!.startsWith("/")?item.image!.slice(1):item.image!)),
    `Imagen faltante: ${item.sourceRow} ${item.image}`).toBe(true);
  }
 });
});
