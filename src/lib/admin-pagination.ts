import "server-only";
import {z} from "zod";
import {privilegedDb} from "@/lib/supabase";
import type {Order,WhatsAppRequest} from "@/lib/types";

export const ADMIN_PAGE_SIZE=20;
export const adminPageKind=z.enum(["orders","whatsapp"]);
export type AdminPageKind=z.infer<typeof adminPageKind>;
const cursorSchema=z.object({
 created_at:z.iso.datetime({offset:true}),
 id:z.uuid()
}).strict();
export type AdminCursor=z.infer<typeof cursorSchema>;
export type AdminPage<T>={items:T[];nextCursor:string|null};

/** Cursor opaque para el navegador; nunca contiene datos de clientes. */
export function encodeAdminCursor(record:AdminCursor){
 return Buffer.from(JSON.stringify({created_at:record.created_at,id:record.id})).toString("base64url");
}
export function decodeAdminCursor(raw:string|null|undefined):AdminCursor|null{
 if(!raw)return null;
 if(raw.length>256)throw new Error("Cursor inválido");
 let parsed:unknown;
 try{
  parsed=JSON.parse(Buffer.from(raw,"base64url").toString("utf8"));
 }catch{throw new Error("Cursor inválido");}
 const cursor=cursorSchema.safeParse(parsed);
 if(!cursor.success)throw new Error("Cursor inválido");
 return cursor.data;
}

const ordersSelect="id,customer_name,customer_email,customer_phone,address,shipping_method,shipping_cost,total,status,payment_status,payment_method,reservation_expires_at,stock_released_at,created_at,order_items(product_name,unit_price,quantity)";
const requestsSelect="id,customer_name,locality,address,notes,payment_preference,shipping_method,items,subtotal,stock_confirmed,shipping_cost,total,amount_paid,status,payment_status,created_at,updated_at,whatsapp_request_payments(id,amount,transfer_reference,payment_method,created_at)";

/**
 * Se consultan PAGE_SIZE+1 filas para saber si hay siguiente página sin COUNT(*)
 * en cada solicitud. Orden por fecha e ID para no perder filas con timestamps iguales.
 * La tabla sigue cerrada por RLS; solo la API/SSR con admin verificado puede usar service_role.
 */
export async function loadAdminPage(kind:"orders",cursor?:AdminCursor|null):Promise<AdminPage<Order>>;
export async function loadAdminPage(kind:"whatsapp",cursor?:AdminCursor|null):Promise<AdminPage<WhatsAppRequest>>;
export async function loadAdminPage(kind:AdminPageKind,cursor?:AdminCursor|null):Promise<AdminPage<Order|WhatsAppRequest>>{
 const db=privilegedDb();
 let q=db.from(kind==="orders"?"orders":"whatsapp_order_requests")
  .select(kind==="orders"?ordersSelect:requestsSelect)
  .order("created_at",{ascending:false})
  .order("id",{ascending:false})
  .limit(ADMIN_PAGE_SIZE+1);
 if(cursor){
  // ISO y UUID fueron validados por Zod; no interpolar ninguna entrada arbitraria.
  q=q.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
 }
 const {data,error}=await q;
 if(error)throw new Error("No se pudieron cargar los pedidos");
 const rows=(data??[]) as (Order|WhatsAppRequest)[];
 const hasMore=rows.length>ADMIN_PAGE_SIZE;
 const items=rows.slice(0,ADMIN_PAGE_SIZE);
 const last=items.at(-1);
 return {items,nextCursor:hasMore&&last?encodeAdminCursor({created_at:last.created_at,id:last.id}):null};
}
