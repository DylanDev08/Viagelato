import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import Login from "@/app/login/page";

const router={replace:vi.fn(),refresh:vi.fn()};
const signInWithPassword=vi.fn();
const signOut=vi.fn();
vi.mock("next/navigation",()=>({useRouter:()=>router}));
vi.mock("@/lib/browser",()=>({browserDb:()=>({
 auth:{signInWithPassword,signOut}
})}));
vi.mock("@/components/turnstile-challenge",()=>({
 TurnstileChallenge:()=>null,
}));

beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","");
 signInWithPassword.mockResolvedValue({error:null});
 signOut.mockResolvedValue({error:null});
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});

async function fill(){
 const user=userEvent.setup();
 render(<Login/>);
 await user.type(screen.getByLabelText("Email"),"admin@example.com");
 await user.type(screen.getByLabelText("Contraseña"),"A-long-password-123");
 await user.click(screen.getByRole("button",{name:"Ingresar"}));
}

describe("login administrativo de transición",()=>{
 it("en modo seguro por defecto conserva login existente y verifica permisos",async()=>{
  vi.stubEnv("NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED","false");
  const fetcher=vi.fn(async()=>Response.json({authorized:true}));
  vi.stubGlobal("fetch",fetcher);
  await fill();
  await waitFor(()=>expect(router.replace).toHaveBeenCalledWith("/admin"));
  expect(signInWithPassword).toHaveBeenCalledWith({
   email:"admin@example.com",password:"A-long-password-123"
  });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0][0]).toBe("/api/admin/session");
 });
 it("el nuevo login no puede saltar al modo de navegador cuando está habilitado",async()=>{
  vi.stubEnv("NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED","true");
  const fetcher=vi.fn(async(url:string)=>Response.json(url.includes("admin-login")?{authorized:true}:{authorized:true}));
  vi.stubGlobal("fetch",fetcher);
  await fill();
  await waitFor(()=>expect(router.replace).toHaveBeenCalledWith("/admin"));
  expect(signInWithPassword).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][0]).toBe("/api/auth/admin-login");
 });
 it("si la cuenta no tiene permisos, cierra sesión al usar login anterior",async()=>{
  vi.stubEnv("NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED","false");
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({authorized:false},{status:401})));
  await fill();
  await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent(/No se pudo confirmar/));
  expect(signOut).toHaveBeenCalledOnce();
  expect(router.replace).not.toHaveBeenCalled();
 });
});
