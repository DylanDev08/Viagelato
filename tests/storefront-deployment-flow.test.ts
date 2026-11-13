import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("producción: salud de Vercel y flujo de ficha de producto",()=>{
 it("la verificación de salud no depende del antiguo Render",()=>{
  const config=readFileSync("next.config.ts","utf8");
  expect(config).toContain('const renderRoutes=["/api/cron/:path*"]');
  expect(config).not.toContain('const renderRoutes=["/api/checkout"');
  expect(config).not.toMatch(/const renderRoutes=\[[^\]]*"\/api\/health"/);
  const route=readFileSync("src/app/api/health/route.ts","utf8");
  expect(route).toMatch(/status:\\s*["']ok["']/);
  expect(route).not.toMatch(/databaseConfigured|checkoutEnabled|RENDER_SERVICE_ID/);
 });
 it("la ficha ofrece Agregar al carrito antes de la descripción",()=>{
  const page=readFileSync("src/app/catalogo/vista/[id]/page.tsx","utf8");
  const action=page.indexOf("<PricedAddToCart item={item} detail/>");
  const description=page.indexOf("<h2>Descripción del producto</h2>");
  expect(action).toBeGreaterThan(0);
  expect(description).toBeGreaterThan(action);
  expect(page).not.toContain("Consultar por WhatsApp <");
 });
});
