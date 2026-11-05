import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const css=readFileSync("src/app/button-hover-theme.css","utf8");
const layout=readFileSync("src/app/layout.tsx","utf8");

describe("hover invertido monocromático de Viagelato",()=>{
 it("carga las interacciones después de los estilos previos",()=>{
  expect(layout).toContain('import "./button-hover-theme.css";');
  expect(layout.indexOf('import "./button-hover-theme.css";')).toBeGreaterThan(
   layout.indexOf('import "./cart-experience.css";')
  );
 });
 it("intercambia fondo y texto entre botones oscuros y claros",()=>{
  expect(css).toContain("background:var(--via-hover-paper);");
  expect(css).toContain("color:var(--via-hover-ink);");
  expect(css).toContain("background:var(--via-hover-ink);");
  expect(css).toContain("color:var(--via-hover-paper);");
  for(const selector of [".primary-action",".secondary-action",".priced-add-button",
    ".checkout-refresh .cart-submit",".category-tabs button",".detail-cart-next",
    ".admin-main .btn"]){
   expect(css).toContain(selector);
  }
 });
 it("respeta dispositivos táctiles, accesibilidad y botones bloqueados",()=>{
  expect(css).toContain("@media (hover:hover) and (pointer:fine)");
  expect(css).toContain("@media (prefers-reduced-motion:reduce)");
  expect(css).toContain(":focus-visible");
  expect(css).toContain(":not(:disabled):hover");
  expect(css).toContain(".btn.tiny:not(.danger)");
  expect(css).toContain("La interacción por teclado");
 });
});
