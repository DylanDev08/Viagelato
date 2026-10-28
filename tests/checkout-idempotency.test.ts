import {createHash,webcrypto} from "node:crypto";
import {describe,expect,it} from "vitest";
import {CHECKOUT_KEY_STORAGE,checkoutRequestFingerprint,clearCheckoutKey,getOrCreateCheckoutKey} from "@/lib/checkout-idempotency";
import {normalizeCatalogText} from "@/lib/catalog-search";

function memoryStorage(){
 const data=new Map<string,string>();
 return {
  getItem:(key:string)=>data.get(key)??null,
  setItem:(key:string,value:string)=>{data.set(key,value);},
  removeItem:(key:string)=>{data.delete(key);},
 };
}
const one="00000000-0000-4000-8000-800000000001";
const two="00000000-0000-4000-8000-800000000002";
describe("clave de idempotencia del checkout",()=>{
 it("calcula una huella SHA-256 sin guardar el cuerpo del pedido",async()=>{
  const body=JSON.stringify({name:"Cliente de prueba",items:[{id:1,quantity:1}]});
  const fingerprint=await checkoutRequestFingerprint(body,webcrypto);
  expect(fingerprint).toBe(createHash("sha256").update(body).digest("hex"));
  const store=memoryStorage();
  getOrCreateCheckoutKey(fingerprint,store,()=>one);
  expect(store.getItem(CHECKOUT_KEY_STORAGE)).not.toContain("Cliente de prueba");
 });
 it("reutiliza la clave si el pedido no cambia; la renueva si cambia",()=>{
  const store=memoryStorage(),a="a".repeat(64),b="b".repeat(64);
  expect(getOrCreateCheckoutKey(a,store,()=>one)).toBe(one);
  expect(getOrCreateCheckoutKey(a,store,()=>two)).toBe(one);
  expect(getOrCreateCheckoutKey(b,store,()=>two)).toBe(two);
  clearCheckoutKey(store);
  expect(store.getItem(CHECKOUT_KEY_STORAGE)).toBeNull();
 });
 it("ignora registros corruptos y permite almacenamiento deshabilitado",()=>{
  const store=memoryStorage();
  store.setItem(CHECKOUT_KEY_STORAGE,"texto inválido");
  expect(getOrCreateCheckoutKey("c".repeat(64),store,()=>one)).toBe(one);
  const disabled={
   getItem:(_key:string):string|null=>{throw new Error("blocked");},
   setItem:(_key:string,_value:string):void=>{throw new Error("blocked");},
   removeItem:(_key:string):void=>{throw new Error("blocked");},
  };
  expect(getOrCreateCheckoutKey("d".repeat(64),disabled,()=>two)).toBe(two);
  expect(()=>clearCheckoutKey(disabled)).not.toThrow();
 });
});
describe("búsqueda de catálogo",()=>{
 it("ignora acentos, mayúsculas y espacios sobrantes",()=>{
  expect(normalizeCatalogText("  Limón Clásico  ")).toBe("limon clasico");
  expect(normalizeCatalogText("CHOCOLATE")).toBe("chocolate");
 });
});
