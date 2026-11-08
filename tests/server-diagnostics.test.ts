import {describe,expect,it,vi} from "vitest";
import {reportServerFailure,safeDatabaseCode} from "@/lib/server-diagnostics";

describe("diagnósticos gratuitos sin datos privados",()=>{
 it("solo conserva códigos SQLSTATE válidos, no mensajes de Postgres",()=>{
  expect(safeDatabaseCode({code:"23505",message:"customer_email=secreto@example.com"})).toBe("23505");
  expect(safeDatabaseCode({code:"the-customer-name-is-private"})).toBe("unknown");
  expect(safeDatabaseCode(null)).toBe("unknown");
 });
 it("no registra nombres, emails, SQL o valores arbitrarios",()=>{
  const spy=vi.spyOn(console,"error").mockImplementation(()=>{});
  try{
   reportServerFailure("admin_data_load_failed",[
    {source:"orders",error:{code:"23505",message:"secret_email@company.com SQL SELECT *"}},
    {source:"malicious_email@company.com",error:{message:"address and auth token"}},
   ]);
   expect(spy).toHaveBeenCalledOnce();
   const log=JSON.stringify(spy.mock.calls[0]);
   expect(log).toContain("admin_data_load_failed");
   expect(log).toContain("23505");
   expect(log).not.toContain("secret_email");
   expect(log).not.toContain("malicious_email");
   expect(log).not.toContain("SQL SELECT");
   expect(log).not.toContain("auth token");
  }finally{spy.mockRestore();}
 });
});
