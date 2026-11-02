import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {SiteFooter} from "@/components/site-footer";
import {DEFAULT_SETTINGS} from "@/lib/types";

describe("footer público",()=>{
 it("mantiene la navegación comercial sin exponer accesos administrativos",()=>{
  const markup=renderToStaticMarkup(<SiteFooter settings={DEFAULT_SETTINGS}/>);
  expect(markup).toContain("/catalogo");
  expect(markup).toContain("/contacto");
  expect(markup).toContain("/carrito");
  expect(markup).not.toMatch(/href=["'][^"']*\/(?:admin|login)(?:[/"'?]|$)/i);
  expect(markup).not.toContain("Acceso administración");
 });
});
