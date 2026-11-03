import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase",()=>({privilegedDb:vi.fn()}));
import {privilegedDb} from "@/lib/supabase";
import {ADMIN_PAGE_SIZE,decodeAdminCursor,encodeAdminCursor,loadAdminPage} from "@/lib/admin-pagination";

const make=(n:number)=>Array.from({length:n},(_,i)=>({
 id:`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,
 created_at:new Date(Date.UTC(2026,10,3,10,0,0)-i*1000).toISOString(),
}));
beforeEach(()=>vi.clearAllMocks());
describe("paginación server-side y cursor sin datos de clientes",()=>{
 it("rechaza cursores manipulados y expone solo fecha/UUID",()=>{
  const cursor=encodeAdminCursor(make(1)[0]);
  expect(decodeAdminCursor(cursor)).toEqual(make(1)[0]);
  expect(cursor).not.toContain("customer_name");
  expect(decodeAdminCursor(null)).toBeNull();
  expect(()=>decodeAdminCursor("not-valid")).toThrow(/Cursor/);
  expect(()=>decodeAdminCursor("A".repeat(300))).toThrow(/Cursor/);
 });
 it("consulta 21 filas para entregar 20 y un cursor estable",async()=>{
  const data=make(ADMIN_PAGE_SIZE+1);
  const limit=vi.fn().mockResolvedValue({data,error:null});
  const order=vi.fn().mockReturnValue({order:vi.fn().mockReturnValue({limit})});
  const select=vi.fn().mockReturnValue({order});
  const from=vi.fn().mockReturnValue({select});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const page=await loadAdminPage("orders");
  expect(page.items).toHaveLength(20);
  expect(page.nextCursor).not.toBeNull();
  expect(decodeAdminCursor(page.nextCursor)).toEqual(data[19]);
  expect(limit).toHaveBeenCalledWith(21);
  expect(from).toHaveBeenCalledWith("orders");
 });
 it("la página posterior aplica cursor con desempate por ID",async()=>{
  const cursor=make(1)[0];
  const or=vi.fn().mockResolvedValue({data:make(1),error:null});
  const limit=vi.fn().mockReturnValue({or});
  const order=vi.fn().mockReturnValue({order:vi.fn().mockReturnValue({limit})});
  const from=vi.fn().mockReturnValue({select:vi.fn().mockReturnValue({order})});
  vi.mocked(privilegedDb).mockReturnValue({from} as unknown as ReturnType<typeof privilegedDb>);
  const result=await loadAdminPage("whatsapp",cursor);
  expect(result.items).toHaveLength(1);
  expect(result.nextCursor).toBeNull();
  expect(or).toHaveBeenCalledWith(expect.stringContaining(`id.lt.${cursor.id}`));
 });
});
