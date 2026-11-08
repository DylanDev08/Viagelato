import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("estilos de administración aislados en la ruta privada",()=>{
 it("la tienda pública no importa el CSS propio del panel",()=>{
  const root=readFileSync("src/app/layout.tsx","utf8");
  expect(root).not.toContain('import "./admin-corte04.css"');
  expect(root).not.toContain('import "./admin-whatsapp-priority.css"');
  // Los estilos de login y recuperación sí se usan fuera de /admin.
  expect(root).toContain('import "./admin-mobile-access.css"');
 });
 it("la ruta admin conserva los estilos de gestión y solicitudes",()=>{
  const admin=readFileSync("src/app/admin/layout.tsx","utf8");
  expect(admin).toContain('import "../admin-corte04.css"');
  expect(admin).toContain('import "../admin-whatsapp-priority.css"');
  expect(admin).toContain('await assertAdmin()');
 });
});
