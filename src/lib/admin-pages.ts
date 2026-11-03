import "server-only";
import {privilegedDb} from "@/lib/supabase";
import {decodeAdminCursor,pagedRows,ADMIN_PAGE_SIZE} from "@/lib/admin-page-cursor";
import type {Order,WhatsAppRequest} from "@/lib/types";

export type AdminPageKind="orders"|"requests";
export type AdminPage<T>={items:T[];nextCursor:string|null};

const ordersSelect="id,customer_name,customer_email,customer_phone,address,shipping_method,shipping_cost,total,status,payment_status,payment_method,reservation_expires_at,stock_released_at,created_at,order_items(product_name,unit_price,quantity)";
const requestsSelect="id,customer_name,locality,address,notes,payment_preference,shipping_method,items,subtotal,stock_confirmed,shipping_cost,total,amount_paid,status,payment_status,created_at,updated_at,whatsapp_request_payments(id,amount,transfer_reference,payment_method,created_at)";

/**
 * Paginación keyset: orden estable (created_at DESC,id DESC), sin OFFSET
 * de coste lineal. Los campos de consulta están fijados en servidor.
 */
export async function loadAdminPage(kind:"orders",cursor?:string|null):Promise<AdminPage<Order>>;
export async function loadAdminPage(kind:"requests",cursor?:string|null):Promise<AdminPage<WhatsAppRequest>>;
export async function loadAdminPage(kind:AdminPageKind,cursor?:string|null):Promise<AdminPage<Order|WhatsAppRequest>>;
export async function loadAdminPage(kind:AdminPageKind,cursor:string|null=null){
 const before=decodeAdminCursor(cursor);
 const db=privilegedDb();
 const table=kind==="orders"?"orders":"whatsapp_order_requests";
 const fields=kind==="orders"?ordersSelect:requestsSelect;
 let query=db.from(table).select(fields);
 if(before){
  // Ambos valores fueron validados por Zod (ISO 8601 y UUID).
  query=query.or(`created_at.lt.${before.t},and(created_at.eq.${before.t},id.lt.${before.i})`);
 }
 const {data,error}=await query.order("created_at",{ascending:false})
  .order("id",{ascending:false}).limit(ADMIN_PAGE_SIZE+1);
 if(error)throw new Error("No se pudieron cargar los pedidos");
 return pagedRows((data??[]) as unknown as (Order|WhatsAppRequest)[]);
}
