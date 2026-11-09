import {render,screen} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {SiteLoading} from "@/components/site-loading";

describe("loading real y accesible",()=>{
 it("muestra identidad y estado de carga sin pasos inventados",()=>{
  render(<SiteLoading/>);
  const state=screen.getByRole("status");
  expect(state).toHaveAttribute("aria-busy","true");
  expect(state).toHaveTextContent("VIAGELATO");
  expect(state).toHaveTextContent("Preparando algo fresco");
  expect(state).not.toHaveTextContent(/Cloudflare|Verificando navegador|100%/i);
 });
 it("diferencia el panel del catálogo sin retrasos falsos",()=>{
  render(<SiteLoading admin/>);
  expect(screen.getByText("Preparando tu panel")).toBeInTheDocument();
  const component=readFileSync("src/components/site-loading.tsx","utf8");
  expect(component).not.toMatch(/setTimeout|setInterval/);
 });
 it("evita animaciones cuando se solicita movimiento reducido",()=>{
  const css=readFileSync("src/app/security-loading.css","utf8");
  expect(css).toContain("@media(prefers-reduced-motion:reduce)");
  expect(css).toContain("animation:none");
 });
});

describe("hover y adaptación visual",()=>{
 const css=readFileSync("src/app/mobile-visual-polish.css","utf8");
 const store=readFileSync("src/components/storefront.tsx","utf8");
 it("coloca la foto de cada banner en una capa recortada animable",()=>{
  expect(store).toContain('className="promo-card-media"');
  expect(store).toContain('aria-hidden="true"');
  expect(css).toContain("overflow:hidden;isolation:isolate");
  expect(css).toContain("background-size:cover");
  expect(css).toContain("transform:scale(1.075)");
 });
 it("solo agranda imágenes con mouse y respeta accesibilidad",()=>{
  expect(css).toContain("(hover:hover) and (pointer:fine)");
  expect(css).toContain("(prefers-reduced-motion:no-preference)");
  expect(css).toContain("@media(prefers-reduced-motion:reduce),(hover:none)");
  expect(css).toContain(":focus-visible");
 });
 it("usa dos tarjetas legibles en móviles medianos y una en móviles estrechos",()=>{
  expect(css).toContain("@media(min-width:390px) and (max-width:640px)");
  expect(css).toContain("@media(max-width:389px)");
  expect(css).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
  expect(css).toContain("grid-template-columns:minmax(0,1fr)");
  expect(css).toContain(".priced-catalog .priced-add-button{min-height:44px");
 });
 it("mantiene banners legibles e imágenes sin hover persistente en pantallas táctiles",()=>{
  expect(css).toContain(".promo-card::before{background:linear-gradient");
  expect(css).toContain(".promo-card>svg{right:17px;bottom:22px}");
  expect(css).toContain("@media(hover:none)");
  expect(css).toContain(".home-type-card:hover");
 });
 it("reduce el loader en horizontal y pantallas estrechas",()=>{
  const loading=readFileSync("src/app/security-loading.css","utf8");
  expect(loading).toContain("@media(max-height:540px) and (max-width:960px)");
  expect(loading).toContain("@media(max-width:389px)");
 });
 it("extiende tamaños táctiles de tablet y tipografía anti zoom",()=>{
  expect(css).toContain("@media(min-width:641px) and (max-width:960px)");
  expect(css).toContain(".site-header .header-cart{min-width:44px;min-height:44px}");
  expect(css).toContain(".checkout-refresh .cart-line .qty button{min-width:44px;min-height:44px");
  expect(css).toContain(".checkout-refresh .cart-form-panel>label>textarea{font-size:16px}");
 });
 it("prioriza mobile estrecho y deja libre el carrito sin barra flotante",()=>{
  const layout=readFileSync("src/app/layout.tsx","utf8");
  expect(layout.indexOf('import "./mobile-visual-polish.css";')).toBeGreaterThan(layout.indexOf('import "./button-hover-theme.css";'));
  expect(css).toContain("@media(max-width:420px)");
  expect(css).toContain("@media(max-width:350px)");
  expect(css).toContain("body:has(.floating-actions)");
  expect(css).toContain("grid-template-columns:minmax(0,1fr)");
 });
});
