import {NextRequest,NextResponse} from "next/server";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/auth/admin-login/route";
import {connected,privilegedDb} from "@/lib/supabase";
import {verifyTurnstile} from "@/lib/turnstile";
import {rateLimitClientKey} from "@/lib/request-security";
import {adminLoginSession} from "@/lib/admin-login-session";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({connected:vi.fn(()=>true),privilegedDb:vi.fn()}));
vi.mock("@/lib/turnstile",()=>({verifyTurnstile:vi.fn(async()=>({ok:true}))}));
vi.mock("@/lib/request-security",()=>({rateLimitClientKey:vi.fn(()=>"a".repeat(64))}));
vi.mock("@/lib/admin-login-session",()=>({adminLoginSession:vi.fn()}));
const signIn=vi.fn();
const signOut=vi.fn(async()=>({error:null}));
const getUser=vi.fn();
const rpc=vi.fn();
const maybeSingle=vi.fn();
const clear=vi.fn();
const sessionResponse=vi.fn((body:Record<string,unknown>,status=200)=>NextResponse.json(body,{
 status,headers:{"Cache-Control":"private, no-store"}
}));
const origin="https://viagelato.vercel.app";
const request=(body:unknown,from=origin)=>new NextRequest(origin+"/api/auth/admin-login",{
 method:"POST",headers:{"Content-Type":"application/json",Origin:from},
 body:JSON.stringify(body),
});
const valid={email:"admin@example.com",password:"correct-long-password"};
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED","false");
 vi.stubEnv("ADMIN_SERVER_LOGIN_CANARY_ENABLED","true");
 vi.stubEnv("CHECKOUT_RATE_LIMIT_SALT","test-only-HMAC-key-very-long-at-least-32-bytes");
 vi.mocked(connected).mockReturnValue(true);
 vi.mocked(verifyTurnstile).mockResolvedValue({ok:true});
 rpc.mockResolvedValue({data:true,error:null});
 maybeSingle.mockResolvedValue({data:{user_id:"admin-123"},error:null});
 signIn.mockResolvedValue({data:{user:{id:"admin-123"}},error:null});
 getUser.mockResolvedValue({data:{user:{id:"admin-123"}},error:null});
 vi.mocked(privilegedDb).mockReturnValue({rpc,from:()=>({
  select:()=>({eq:()=>({maybeSingle})})
 })} as unknown as ReturnType<typeof privilegedDb>);
 vi.mocked(adminLoginSession).mockReturnValue({
  client:{auth:{signInWithPassword:signIn,getUser,signOut}},
  clear,response:sessionResponse
 } as unknown as ReturnType<typeof adminLoginSession>);
});
afterEach(()=>vi.unstubAllEnvs());
describe("login administrado por servidor",()=>{
 it("deshabilita endpoint cuando faltan las dos banderas",async()=>{
  vi.stubEnv("ADMIN_SERVER_LOGIN_CANARY_ENABLED","false");
  const r=await POST(request(valid));
  expect(r.status).toBe(503);
  expect(signIn).not.toHaveBeenCalled();
 });
 it("canary server separado del login viejo; rechaza CSRF antes de Auth",async()=>{
  expect((await POST(request(valid,"https://evil.example"))).status).toBe(403);
  expect(signIn).not.toHaveBeenCalled();
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("rechaza cuerpo malformado y correo inválido antes de Supabase",async()=>{
  expect((await POST(request({email:"bad",password:"x"}))).status).toBe(400);
  expect(signIn).not.toHaveBeenCalled();
 });
 it("límite atómico del login bloquea ataques sin autenticar",async()=>{
  rpc.mockResolvedValue({data:false,error:null});
  const response=await POST(request(valid));
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("900");
  expect(signIn).not.toHaveBeenCalled();
 });
 it("rechaza Turnstile inválido",async()=>{
  vi.mocked(verifyTurnstile).mockResolvedValue({ok:false,reason:"invalid"});
  expect((await POST(request(valid))).status).toBe(403);
  expect(signIn).not.toHaveBeenCalled();
 });
 it("no autoriza cuentas ajenas a admin_users y limpia la sesión",async()=>{
  maybeSingle.mockResolvedValue({data:null,error:null});
  const r=await POST(request(valid));
  expect(r.status).toBe(401);
  expect(signOut).toHaveBeenCalledWith({scope:"local"});
  expect(clear).toHaveBeenCalledOnce();
  expect((await r.json()).error).not.toContain("admin-123");
 });
 it("rechaza una identidad que cambió tras iniciar sesión",async()=>{
  getUser.mockResolvedValue({data:{user:{id:"otra-cuenta"}},error:null});
  expect((await POST(request(valid))).status).toBe(401);
  expect(clear).toHaveBeenCalledOnce();
  expect(maybeSingle).not.toHaveBeenCalled();
 });
 it("autoriza identidad verificada y rol real, sin enviar tokens en JSON",async()=>{
  const r=await POST(request({...valid,turnstile_token:"token-prueba"}));
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({authorized:true});
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(signIn).toHaveBeenCalledWith({email:valid.email,password:valid.password});
  expect(getUser).toHaveBeenCalledOnce();
  expect(verifyTurnstile).toHaveBeenCalledWith("token-prueba","admin_login");
  expect(rpc).toHaveBeenCalledWith("consume_checkout_attempt",expect.objectContaining({
   p_limit:5,p_window_minutes:15,p_idempotency_key:expect.any(String)
  }));
  expect(clear).not.toHaveBeenCalled();
 });
});
