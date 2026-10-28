import {describe,expect,it} from "vitest";
import {recoveryError} from "@/lib/recovery-errors";
describe("recuperación de cuenta sin reintentos compulsivos",()=>{
 it("reconoce cuota de correo 429 sin exponer la dirección del usuario",()=>{
  const p=recoveryError({status:429,code:"over_email_send_rate_limit",message:"email rate limit exceeded"});
  expect(p.kind).toBe("rate_limited");expect(p.message).toContain("No se envió otro mensaje");
 });
 it("oculta detalles internos del servidor",()=>{
  const p=recoveryError({status:500,message:"Private token found"});
  expect(p.kind).toBe("general");expect(p.message).not.toContain("Private token");
 });
});
