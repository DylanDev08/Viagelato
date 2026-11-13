import {NextRequest} from "next/server";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {createServerClient} from "@supabase/ssr";
import {adminLoginSession} from "@/lib/admin-login-session";
import {ADMIN_SERVER_COOKIE_NAME} from "@/lib/admin-session-cookies";

vi.mock("server-only",()=>({}));
vi.mock("@supabase/ssr",()=>({createServerClient:vi.fn(()=>({auth:{}}))}));
const url="https://viagelato.vercel.app";
type CookieAdapter={
 cookies:{
  getAll:()=>Array<{name:string;value:string}>;
  setAll:(items:Array<{name:string;value:string;options:Record<string,unknown>}>,headers?:Record<string,string>)=>void;
 };
 cookieOptions:{name:string;httpOnly:boolean;secure:boolean;sameSite:string};
};
function adapter():CookieAdapter{
 const args=vi.mocked(createServerClient).mock.lastCall;
 if(!args)throw Error("El cliente del servidor no se inicializó");
 return args[2] as unknown as CookieAdapter;
}
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.supabase.co");
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");
 vi.stubEnv("NODE_ENV","production");
});
afterEach(()=>vi.unstubAllEnvs());

describe("cookies de sesión administrativa exclusivas del servidor",()=>{
 it("almacena sesiones en cookies HttpOnly, Secure, SameSite=Lax y no envía token en JSON",async()=>{
  const request=new NextRequest(url+"/api/auth/admin-login",{method:"POST"});
  const session=adminLoginSession(request);
  expect(adapter().cookieOptions).toMatchObject({
   name:ADMIN_SERVER_COOKIE_NAME,httpOnly:true,secure:true,sameSite:"lax"
  });
  adapter().cookies.setAll([
   {name:ADMIN_SERVER_COOKIE_NAME+".0",value:"token-super-secreto",options:{path:"/",maxAge:3600}},
  ],{"Cache-Control":"private, no-store","Expires":"0","Pragma":"no-cache"});
  const response=session.response({authorized:true});
  expect(await response.json()).toEqual({authorized:true});
  const setCookie=response.headers.get("set-cookie")||"";
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("Secure");
  expect(setCookie).toContain("SameSite=lax");
  expect(setCookie).toContain("token-super-secreto");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
 });
 it("no reenvía ni altera las cookies legacy y limpia todos los fragmentos del servidor",()=>{
  const cookie=`${ADMIN_SERVER_COOKIE_NAME}.0=a; ${ADMIN_SERVER_COOKIE_NAME}.1=b; sb-legacy-auth-token=other`;
  const request=new NextRequest(url+"/api/auth/admin-logout",{headers:{cookie}});
  const session=adminLoginSession(request);
  expect(adapter().cookies.getAll().map(x=>x.name)).toEqual([
   ADMIN_SERVER_COOKIE_NAME+".0",ADMIN_SERVER_COOKIE_NAME+".1"
  ]);
  session.clear();
  const response=session.response({signedOut:true});
  const all=response.cookies.getAll();
  expect(all).toHaveLength(2);
  expect(all.every(x=>x.value===""||x.value===undefined)).toBe(true);
  expect(all.every(x=>x.name.startsWith(ADMIN_SERVER_COOKIE_NAME))).toBe(true);
  expect(response.cookies.get("sb-legacy-auth-token")).toBeUndefined();
 });
});
