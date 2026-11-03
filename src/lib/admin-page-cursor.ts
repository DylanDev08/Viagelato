import {z} from "zod";

/** Token de posición (no representa permiso). Nunca contiene datos de clientes. */
const cursorSchema=z.object({
 t:z.iso.datetime({offset:true}),
 i:z.uuid(),
}).strict();
export type AdminCursor=z.infer<typeof cursorSchema>;
export const ADMIN_PAGE_SIZE=25;

export function encodeAdminCursor(record:{created_at:string;id:string}):string{
 const parsed=cursorSchema.parse({t:record.created_at,i:record.id});
 return Buffer.from(JSON.stringify(parsed),"utf8").toString("base64url");
}

export function decodeAdminCursor(value:string|null):AdminCursor|null{
 if(value===null)return null;
 if(!/^[A-Za-z0-9_-]{1,256}$/.test(value))throw new Error("Cursor inválido");
 try{
  const parsed=JSON.parse(Buffer.from(value,"base64url").toString("utf8")) as unknown;
  const result=cursorSchema.safeParse(parsed);
  if(result.success)return result.data;
 }catch{/* Valor manipulado o fuera de formato. */}
 throw new Error("Cursor inválido");
}

export function pagedRows<T extends {created_at:string;id:string}>(rows:T[]):{
 items:T[];
 nextCursor:string|null;
}{
 const items=rows.slice(0,ADMIN_PAGE_SIZE);
 return {items,nextCursor:rows.length>ADMIN_PAGE_SIZE&&items.length
  ?encodeAdminCursor(items[items.length-1]):null};
}
