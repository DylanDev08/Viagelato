import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import ForgotPassword from "@/app/recuperar-acceso/page";
import UpdatePassword from "@/app/actualizar-contrasena/page";

const mock={
 resetPasswordForEmail:vi.fn(),
 updateUser:vi.fn(),
 signOut:vi.fn(),
 getSession:vi.fn(),
 onAuthStateChange:vi.fn()
};
vi.mock("@/lib/browser",()=>({browserDb:()=>({auth:mock})}));
describe("recuperación de contraseña administrativa",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  mock.resetPasswordForEmail.mockResolvedValue({error:null});
  mock.updateUser.mockResolvedValue({error:null});
  mock.signOut.mockResolvedValue({error:null});
  mock.getSession.mockResolvedValue({data:{session:{user:{id:"admin"}}}});
  mock.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});
 });
 it("manda recuperación con retorno al dominio real y mensaje genérico",async()=>{
  const user=userEvent.setup();
  render(<ForgotPassword/>);
  await user.type(screen.getByRole("textbox",{name:"Email"}),"admin@example.com");
  await user.click(screen.getByRole("button",{name:"Enviar enlace de recuperación"}));
  await waitFor(()=>expect(mock.resetPasswordForEmail).toHaveBeenCalledWith("admin@example.com",{
   redirectTo:"http://localhost:3000/actualizar-contrasena"
  }));
  expect(screen.getByText(/Revisá tu correo electrónico/)).toBeInTheDocument();
 });
 it("exige contraseñas iguales y de 12 caracteres",async()=>{
  const user=userEvent.setup();render(<UpdatePassword/>);
  await screen.findByText("Guardar contraseña");
  await user.type(screen.getByLabelText("Contraseña nueva"),"UnaClaveMuchoMasLarga!");
  await user.type(screen.getByLabelText("Repetir contraseña"),"OtraClaveMuchoMasLarga!");
  await user.click(screen.getByRole("button",{name:"Guardar contraseña"}));
  expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
  expect(mock.updateUser).not.toHaveBeenCalled();
 });
 it("permite guardar nueva contraseña con sesión del enlace",async()=>{
  const user=userEvent.setup();render(<UpdatePassword/>);
  await screen.findByText("Guardar contraseña");
  await user.type(screen.getByLabelText("Contraseña nueva"),"UnaClaveMuchoMasLarga!");
  await user.type(screen.getByLabelText("Repetir contraseña"),"UnaClaveMuchoMasLarga!");
  await user.click(screen.getByRole("button",{name:"Guardar contraseña"}));
  await waitFor(()=>expect(mock.updateUser).toHaveBeenCalledWith({password:"UnaClaveMuchoMasLarga!"}));
  expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
  expect(mock.signOut).toHaveBeenCalled();
 });
 it("no muestra formulario si no hay sesión",async()=>{
  mock.getSession.mockResolvedValue({data:{session:null}});
  render(<UpdatePassword/>);
  await screen.findByText(/El enlace no es válido/);
  expect(screen.queryByRole("button",{name:"Guardar contraseña"})).not.toBeInTheDocument();
 });
});
