import {beforeEach,describe,expect,it,vi} from "vitest";
import {POST} from "@/app/api/auth/admin-login/route";
import {connected,privilegedDb,userDb} from "@/lib/supabase";
import {verifyTurnstile} from "@/lib/turnstile";
import {rateLimitClientKey} from "@/lib/request-security";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({connected:vi.fn(()=>true),privilegedDb:vi.fn(),userDb:vi.fn()}));
vi.mock("@/lib/turnstile",()=>({verifyTurnstile:vi.fn(async()=>({ok:true}))}));
vi.mock("@/lib/request-security",()=>({rateLimitClientKey:vi.fn(()=>"a".repeat(64))}));

const signIn=vi.fn();
const signOut=vi.fn(async()=>({error:null}));
const rpc=vi.fn();
const maybeSingle=vi.fn();
const origin="https://viagelato.vercel.app";
const request=(body:unknown,from=origin)=>new Request(origin+"/api/auth/admin-login",{
 method:"POST",headers:{"Content-Type":"application/json",Origin:from},
 body:JSON.stringify(body),
});
const valid={email:"admin@example.com",password:"correct-long-password"};

beforeEach(()=>{
 vi.clearAllMocks();
 process.env.CHECKOUT_RATE_LIMIT_SALT="test-only-HMAC-key-very-long-at-least-32-bytes";
 vi.mocked(connected).mockReturnValue(true);
 vi.mocked(verifyTurnstile).mockResolvedValue({ok:true});
 vi.mocked(rateLimitClientKey).mockReturnValue("a".repeat(64));
 rpc.mockResolvedValue({data:true,error:null});
 maybeSingle.mockResolvedValue({data:{user_id:"admin-123"},error:null});
 signIn.mockResolvedValue({data:{user:{id:"admin-123"}},error:null});
 vi.mocked(privilegedDb).mockReturnValue({rpc,from:()=>({
  select:()=>({eq:()=>({maybeSingle})})
 })} as unknown as ReturnType<typeof privilegedDb>);
 vi.mocked(userDb).mockResolvedValue({auth:{signInWithPassword:signIn,signOut}} as unknown as Awaited<ReturnType<typeof userDb>>);
});

describe("login de administrador por servidor",()=>{
 it("no acepta CSRF/origen externo antes de tocar Supabase",async()=>{
  const r=await POST(request(valid,"https://evil.example"));
  expect(r.status).toBe(403);
  expect(privilegedDb).not.toHaveBeenCalled();
 });
 it("rechaza datos malformados sin autenticar",async()=>{
  expect((await POST(request({email:"bad",password:"x"}))).status).toBe(400);
  expect(signIn).not.toHaveBeenCalled();
 });
 it("limita intentos antes de contraseñas y devuelve retry-after",async()=>{
  rpc.mockResolvedValue({data:false,error:null});
  const r=await POST(request(valid));
  expect(r.status).toBe(429);
  expect(r.headers.get("retry-after")).toBe("900");
  expect(signIn).not.toHaveBeenCalled();
 });
 it("exige Turnstile antes de probar la contraseña",async()=>{
  vi.mocked(verifyTurnstile).mockResolvedValue({ok:false,reason:"invalid"});
  const r=await POST(request(valid));
  expect(r.status).toBe(403);
  expect(signIn).not.toHaveBeenCalled();
  expect(verifyTurnstile).toHaveBeenCalledWith(undefined,"admin_login");
 });
 it("no otorga sesión a usuario que no pertenece a admin_users",async()=>{
  maybeSingle.mockResolvedValue({data:null,error:null});
  const r=await POST(request(valid));
  expect(r.status).toBe(401);
  expect(signOut).toHaveBeenCalledOnce();
  expect((await r.json()).error).not.toContain("admin-123");
 });
 it("autoriza un usuario administrador, con sesión privada sin exponer tokens",async()=>{
  const r=await POST(request({...valid,turnstile_token:"one-time-token"}));
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({authorized:true});
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(signIn).toHaveBeenCalledWith({email:"admin@example.com",password:valid.password});
  expect(verifyTurnstile).toHaveBeenCalledWith("one-time-token","admin_login");
  expect(rpc).toHaveBeenCalledWith("consume_checkout_attempt",expect.objectContaining({
   p_limit:5,p_window_minutes:15,p_idempotency_key:expect.any(String)
  }));
 });
});
