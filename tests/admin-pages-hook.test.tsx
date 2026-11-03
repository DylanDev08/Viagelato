import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
import {useAdminPages} from "@/hooks/use-admin-pages";

type Row={id:string;created_at:string;name:string};
const initial:Row[]=[{id:"id1",created_at:"2026-11-03T00:00:00Z",name:"Uno"}];
function Probe({cursor="token"}:{cursor?:string|null}){
 const pages=useAdminPages("orders",initial,cursor);
 return <><span data-testid="names">{pages.items.map(p=>p.name).join(",")}</span><span data-testid="more">{String(pages.hasMore)}</span>
  {pages.hasMore&&<button disabled={pages.loading} onClick={()=>void pages.loadMore()}>Cargar más</button>}
  {pages.error&&<p role="alert">{pages.error}</p>}</>;
}
beforeEach(()=>vi.unstubAllGlobals());
afterEach(()=>vi.unstubAllGlobals());
describe("carga incremental sin duplicados",()=>{
 it("concatena páginas y omite registros repetidos",async()=>{
  const user=userEvent.setup();
  const fetchMock=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({
   items:[initial[0],{id:"id2",created_at:"2026-11-02T00:00:00Z",name:"Dos"}],nextCursor:null
  })});
  vi.stubGlobal("fetch",fetchMock);
  render(<Probe/>);
  await user.click(screen.getByRole("button",{name:"Cargar más"}));
  await waitFor(()=>expect(screen.getByTestId("names")).toHaveTextContent("Uno,Dos"));
  expect(screen.getByTestId("more")).toHaveTextContent("false");
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][0]).toContain("kind=orders");
  expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
 });
 it("muestra errores y permite reintentos con el mismo cursor",async()=>{
  const user=userEvent.setup();
  const fetchMock=vi.fn().mockResolvedValueOnce({status:503,ok:false,json:async()=>({error:"falló"})})
   .mockResolvedValueOnce({status:200,ok:true,json:async()=>({items:[],nextCursor:null})});
  vi.stubGlobal("fetch",fetchMock);
  render(<Probe/>);
  await user.click(screen.getByRole("button",{name:"Cargar más"}));
  expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudieron cargar/);
  await user.click(screen.getByRole("button",{name:"Cargar más"}));
  await waitFor(()=>expect(screen.getByTestId("more")).toHaveTextContent("false"));
  expect(fetchMock).toHaveBeenCalledTimes(2);
 });
});
