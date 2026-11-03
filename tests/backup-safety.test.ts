import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
describe("respaldos gratis sin exponer datos en GitHub",()=>{
 const backup=readFileSync("scripts/backup-viagelato.ps1","utf8");
 const setup=readFileSync("scripts/backup-viagelato-setup.ps1","utf8");
 const verify=readFileSync("scripts/backup-viagelato-verify.ps1","utf8");
 it("exporta la base comercial en esquema público, verifica y cifra antes de guardar",()=>{
  expect(backup).toContain("--schema=public");
  expect(backup).toContain("--format=custom");
  expect(backup).toContain("pg_restore --list");
  expect(backup).toContain("--encrypt");
  expect(backup).toContain("SHA256");
  expect(backup).toContain("Remove-Item -LiteralPath $workDir -Recurse -Force");
  expect(verify).toContain("--decrypt");
  expect(verify).toContain("pg_restore --list");
 });
 it("usa credenciales DPAPI por usuario, nunca secrets en código o repo",()=>{
  expect(setup).toContain("ConvertFrom-SecureString");
  expect(backup).toContain("ConvertTo-SecureString");
  expect(backup).toContain("mxopaakzlmjbnrwolpgh");
  expect(backup).toContain("postgres:17-alpine");
  expect(backup).not.toContain("git push");
  expect(backup).not.toContain("upload-artifact");
  expect(backup).not.toContain("service_role");
 });
});
