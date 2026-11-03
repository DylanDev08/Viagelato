import {beforeEach,describe,expect,it,vi} from "vitest";
import {loadAdminPage} from "@/lib/admin-pages";
import {privilegedDb} from "@/lib/supabase";
import {encodeAdminCursor,ADMIN_PAGE_SIZE} from "@/lib/admin-page-cursor";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({privilegedDb:vi.fn()}));
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const chain={select:vi.fn(),or:vi.fn(),order:vi.fn(),limit:vi.fn()};
const from=vi.fn().mockReturnValue(chain);
beforeEach(()=>{
 vi.clearAllMocks();
 chain.select.mockReturnValue(chain);chain.or.mockReturnValue(chain);chain.order.mockReturnValue(chain);
 vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
});
describe("lectura SQL keyset del panel",()=>{
 it("consulta 26 filas, devuelve 25 y cursor para la siguiente página",async()=>{
  const rows=Array.from({length:ADMIN_PAGE_SIZE+1},(_,n)=>({id:id(100-n),created_at:"2026-11-03T12:00:00.000Z"}));
  chain.limit.mockResolvedValueOnce({data:rows,error:null});
  const page=await loadAdminPage("requests");
  expect(from).toHaveBeenCalledWith("whatsapp_order_requests");
  expect(chain.select).toHaveBeenCalledWith(expect.stringContaining("whatsapp_request_payments"));
  expect(chain.limit).toHaveBeenCalledWith(26);
  expect(chain.order).toHaveBeenNthCalledWith(1,"created_at",{ascending:false});
  expect(chain.order).toHaveBeenNthCalledWith(2,"id",{ascending:false});
  expect(chain.or).not.toHaveBeenCalled();
  expect(page.items).toHaveLength(25);
  expect(page.nextCursor).toBeTruthy();
 });
 it("filtra por fecha+id y rechaza cursor SQL manipulado",async()=>{
  const token=encodeAdminCursor({created_at:"2026-11-02T15:00:00.000Z",id:id(9)});
  chain.limit.mockResolvedValueOnce({data:[],error:null});
  const page=await loadAdminPage("orders",token);
  expect(from).toHaveBeenCalledWith("orders");
  expect(chain.or).toHaveBeenCalledWith(expect.stringContaining("and(created_at.eq.2026-11-02T15:00:00.000Z,id.lt."));
  expect(page.nextCursor).toBeNull();
  await expect(loadAdminPage("orders","id.gt.0")).rejects.toThrow(/Cursor inválido/);
 });
});
