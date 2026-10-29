import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {redirect} from "next/navigation";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS,type Product,type Category,type Order,type ShippingZone,type Settings,type Banner,type WhatsAppRequest} from "@/lib/types";

export default async function AdminPage(){
 try{await assertAdmin();}catch{redirect("/login");}
 const db=privilegedDb();
 const [products,categories,orders,zones,site,payment,banners,requests]=await Promise.all([
  db.from("products").select("*").order("created_at",{ascending:false}),
  db.from("categories").select("*").order("name"),
  db.from("orders").select("id,customer_name,customer_email,customer_phone,address,shipping_method,shipping_cost,total,status,payment_status,payment_method,reservation_expires_at,stock_released_at,created_at,order_items(product_name,unit_price,quantity)").order("created_at",{ascending:false}).limit(60),
  db.from("shipping_zones").select("*").order("name"),
  db.from("site_settings").select("*").eq("id",true).single(),
  db.from("payment_settings").select("*").eq("id",true).single(),
  db.from("banners").select("*").order("sort_order"),
  db.from("whatsapp_order_requests").select("id,customer_name,locality,address,notes,shipping_method,items,subtotal,status,payment_status,created_at,updated_at").order("created_at",{ascending:false}).limit(100),
 ]);
 const failures=[
  ["products",products.error],["categories",categories.error],["orders",orders.error],
  ["shipping_zones",zones.error],["site_settings",site.error],
  ["payment_settings",payment.error],["banners",banners.error],["whatsapp_order_requests",requests.error],
 ].filter((entry)=>entry[1]!==null);
 if(failures.length){
  // Diagnóstico solo en el servidor; nunca mostrar consultas o datos privados al cliente.
  console.error("Viagelato admin data load failed",failures.map(([table,error])=>({
   table,code:typeof error==="object"&&error&&"code" in error?error.code:undefined,
   message:typeof error==="object"&&error&&"message" in error?error.message:undefined,
  })));
  throw new Error("No se pudieron cargar los datos del administrador.");
 }
 const settings={...DEFAULT_SETTINGS,...site.data,...payment.data} as Settings;
 return <AdminDashboard initialProducts={products.data as Product[]} initialCategories={categories.data as Category[]} initialOrders={orders.data as Order[]} initialWhatsAppRequests={requests.data as WhatsAppRequest[]} initialZones={zones.data as ShippingZone[]} initialSettings={settings} initialBanners={banners.data as Banner[]}/>;
}
