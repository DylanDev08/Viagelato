import {describe,expect,it} from "vitest";
import {productWhatsappMessage,whatsappHref} from "@/lib/whatsapp";
import {settingsSchema} from "@/lib/admin-rules";
import {DEFAULT_SETTINGS} from "@/lib/types";
import {PROVISIONAL_PRODUCT_ASSETS,PROVISIONAL_BRAND_ASSETS} from "@/lib/provisional-catalog";

describe("contactos de Viagelato",()=>{
 it("usa un wa.link validado, sin modificar el mensaje configurado externamente",()=>{
  expect(whatsappHref("https://wa.link/aB1234")).toBe("https://wa.link/aB1234");
  expect(settingsSchema.safeParse({...DEFAULT_SETTINGS,whatsapp:"https://wa.link/aB1234"}).success).toBe(true);
 });
 it("genera un enlace directo seguro con teléfono internacional y mensaje",()=>{
  const link=whatsappHref("+54 9 11 1234-5678",productWhatsappMessage("Alfajor helado"));
  expect(link).toContain("https://wa.me/5491112345678?text=");
  expect(decodeURIComponent(link??"")).toContain("Alfajor helado");
 });
 it("no inventa número de WhatsApp ni permite dominios falsos",()=>{
  expect(whatsappHref("")).toBeNull();
  expect(whatsappHref("11 4096-2202")).toBeNull();
  expect(whatsappHref("http://wa.link/abc123")).toBeNull();
  expect(whatsappHref("https://wa.link.evil.com/abc123")).toBeNull();
  expect(whatsappHref("javascript:alert(1)")).toBeNull();
  expect(settingsSchema.safeParse({...DEFAULT_SETTINGS,whatsapp:"https://wa.link.evil.com/abc123"}).success).toBe(false);
 });
 it("las fichas previas excluyen elementos marcados como material de marca",()=>{
  const ids=new Set(PROVISIONAL_PRODUCT_ASSETS.map(a=>a.id));
  expect(PROVISIONAL_BRAND_ASSETS.every(a=>!ids.has(a.id))).toBe(true);
  expect(PROVISIONAL_PRODUCT_ASSETS.length).toBeGreaterThan(0);
 });
});
