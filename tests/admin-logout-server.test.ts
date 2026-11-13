import {NextRequest,NextResponse} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/auth/admin-logout/route";
import {adminLoginSession} from "@/lib/admin-login-session";
import {ADMIN_SERVER_COOKIE_NAME} from "@/lib/admin-session-cookies";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/admin-login-session",()=>({adminLoginSession:vi.fn()}));
const signOut=vi.fn();
const clear=vi.fn();
const response=vi.fn((body:Record<string,unknown>)=>NextResponse.json(body,{
 headers:{"Cache-Control":"private, no-store"}
}));
const url="https://viagelato.vercel.app/api/auth/admin-logout";
beforeEach(()=>{
 vi.clearAllMocks();
 signOut.mockResolvedValue({error:null});
 vi.mocked(adminLoginSession).mockReturnValue({
  client:{auth:{signOut}},clear,response
 } as unknown as ReturnType<typeof adminLoginSession>);
});
describe("cierre de sesión por servidor",()=>{
 it("restringe CSRF y no borra cookies de terceros",async()=>{
  const result=await POST(new NextRequest(url,{method:"POST",headers:{Origin:"https://evil.example"}}));
  expect(result.status).toBe(403);
  expect(clear).not.toHaveBeenCalled();
 });
 it("revoca solo la sesión actual y limpia HttpOnly",async()=>{
  const result=await POST(new NextRequest(url,{method:"POST",headers:{
   Origin:"https://viagelato.vercel.app",
   Cookie:`${ADMIN_SERVER_COOKIE_NAME}.0=token`
  }}));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({signedOut:true});
  expect(signOut).toHaveBeenCalledWith({scope:"local"});
  expect(clear).toHaveBeenCalledOnce();
 });
 it("permite limpiar cookies incluso cuando Auth no responde",async()=>{
  signOut.mockRejectedValueOnce(new Error("offline"));
  const result=await POST(new NextRequest(url,{method:"POST",headers:{
   Origin:"https://viagelato.vercel.app",Cookie:`${ADMIN_SERVER_COOKIE_NAME}=token`
  }}));
  expect(result.status).toBe(200);
  expect(clear).toHaveBeenCalledOnce();
 });
 it("mantiene intacta la sesión antigua si no hay cookie del servidor",async()=>{
  const result=await POST(new NextRequest(url,{method:"POST",headers:{
   Origin:"https://viagelato.vercel.app",Cookie:"sb-legacy-auth-token=token"
  }}));
  expect(result.status).toBe(200);
  expect(signOut).not.toHaveBeenCalled();
  expect(clear).toHaveBeenCalledOnce();
 });
});
