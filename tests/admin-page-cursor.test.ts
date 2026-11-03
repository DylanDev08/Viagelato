import {describe,expect,it} from "vitest";
import {ADMIN_PAGE_SIZE,decodeAdminCursor,encodeAdminCursor,pagedRows} from "@/lib/admin-page-cursor";

describe("cursor keyset de pedidos",()=>{
 const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
 const rows=Array.from({length:ADMIN_PAGE_SIZE+1},(_,index)=>({
  created_at:"2026-11-03T12:00:00.000Z",id:id(100-index),name:`Pedido ${index}`
 }));
 it("mantiene un orden estable incluso con fechas repetidas",()=>{
  const page=pagedRows(rows);
  expect(page.items).toHaveLength(25);
  expect(page.nextCursor).not.toBeNull();
  expect(decodeAdminCursor(page.nextCursor)).toEqual({t:rows[24].created_at,i:rows[24].id});
  expect(page.nextCursor).not.toContain("Pedido");
 });
 it("termina al llegar al final",()=>{
  expect(pagedRows(rows.slice(0,25)).nextCursor).toBeNull();
  expect(pagedRows([]).items).toEqual([]);
 });
 it("rechaza cursores maliciosos e inválidos",()=>{
  expect(decodeAdminCursor(null)).toBeNull();
  for(const value of ["", "invalid!", "a".repeat(500),Buffer.from(JSON.stringify({
   t:"2026-11-03T00:00:00.000Z",i:id(1),filter:"id.gt.0"
  })).toString("base64url"),Buffer.from(JSON.stringify({t:"invalid",i:id(1)})).toString("base64url")]){
   expect(()=>decodeAdminCursor(value)).toThrow(/Cursor inválido/);
  }
 });
 it("genera un cursor sólo con timestamp e identificador",()=>{
  const token=encodeAdminCursor({id:id(1),created_at:"2026-11-03T12:12:12.000Z"});
  expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
 });
});
