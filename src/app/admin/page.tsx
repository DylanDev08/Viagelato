import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {redirect} from "next/navigation";
import {AdminDashboard} from "@/components/admin-dashboard";
import {DEFAULT_SETTINGS,type Product,type Category,type Order,type ShippingZone,type Settings,type Banner} from "@/lib/types";

export default async function AdminPage(){
 try{await assertAdmin();}catch{redirect("/login");}
 const db=privilegedDb();
 const [products,categories,orders,zones,site,payment,banners]=await Promise.all([
  db.from("products").select("*").order("created_at",{ascending:false}),
  db.from("categories").select("*").order("name"),
  db.from("orders").select("id,customer_name,customer_email,customer_phone,address,shipping_method,shipping_cost,total,status,payment_status,payment_method,reservation_expires_at,stock_released_at,created_at,order_items(product_name,unit_price,quantity)").order("created_at",{ascending:false}).limit(60),
  db.from("shipping_zones").select("*").order("name"),
  db.from("site_settings").select("*").eq("id",true).single(),
  db.from("payment_settings").select("*").eq("id",true).single(),
  db.from("banners").select("*").order("sort_order"),
 ]);
 if(products.error||categories.error||orders.error||zones.error||site.error||payment.error||banners.error)throw new Error("No se pudo cargar el panel. Revisá las tablas y el esquema SQL.");
 const settings={...DEFAULT_SETTINGS,...site.data,...payment.data} as Settings;
 return <AdminDashboard initialProducts={products.data as Product[]} initialCategories={categories.data as Category[]} initialOrders={orders.data as Order[]} initialZones={zones.data as ShippingZone[]} initialSettings={settings} initialBanners={banners.data as Banner[]}/>;
}
