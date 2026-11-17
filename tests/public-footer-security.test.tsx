import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {renderToStaticMarkup} from "react-dom/server";
import {SiteFooter} from "@/components/site-footer";
import {DEFAULT_SETTINGS,publicCommercialAddress} from "@/lib/types";

describe("footer público",()=>{
 it("mantiene la navegación comercial sin exponer accesos administrativos",()=>{
  const markup=renderToStaticMarkup(<SiteFooter settings={DEFAULT_SETTINGS}/>);
  expect(markup).toContain("/catalogo");
  expect(markup).toContain("/contacto");
  expect(markup).toContain("/carrito");
  expect(markup).not.toMatch(/href=["'][^"']*\/(?:admin|login)(?:[/"'?]|$)/i);
  expect(markup).not.toContain("Acceso administración");
 });
 it("muestra la dirección comercial nueva sin la localidad antigua",()=>{
  const oldAddress="Eva Perón 3050, Monte Chingolo, Lanús Este, Buenos Aires, Argentina";
  expect(publicCommercialAddress(oldAddress)).toBe("Eva Perón 3050, Lanús Este");
  const markup=renderToStaticMarkup(<SiteFooter settings={{...DEFAULT_SETTINGS,address:oldAddress}}/>);
  expect(markup).toContain("Eva Perón 3050, Lanús Este");
  expect(markup).not.toContain("Monte Chingolo");
 });
 it("elimina los estilos del antiguo acceso administrativo público",()=>{
  const css=readFileSync("src/app/admin-mobile-access.css","utf8");
  expect(css).not.toMatch(/footer-admin-entry|mobile-admin-entry/);
 });
});
