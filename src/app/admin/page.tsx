import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {redirect} from "next/navigation";
import {AdminDashboard} from "@/components/admin-dashboard";
import {reportServerFailure} from "@/lib/server-diagnostics";
import {loadAdminPage} from "@/lib/admin-pages";
import {DEFAULT_SETTINGS,type Product,type Category,type Order,type ShippingZone,type Settings,type Banner} from "@/lib/types";

export default async function AdminPage(){
 try{await assertAdmin();}catch{redirect("/login");}
 const db=privilegedDb();
 const [products,categories,ordersPage,zones,site,payment,banners,requestsPage]=await Promise.all([
  db.from("products").select("*").order("created_at",{ascending:false}),
  db.from("categories").select("*").order("name"),
  loadAdminPage("orders"),
  db.from("shipping_zones").select("*").order("name"),
  db.from("site_settings").select("*").eq("id",true).single(),
  db.from("payment_settings").select("*").eq("id",true).single(),
  db.from("banners").select("*").order("sort_order"),
  loadAdminPage("requests"),
 ]);
 const failures=[
  ["products",products.error],["categories",categories.error],
  ["shipping_zones",zones.error],["site_settings",site.error],
  ["payment_settings",payment.error],["banners",banners.error],
 ].filter((entry)=>entry[1]!==null);
 if(failures.length){
  reportServerFailure("admin_data_load_failed",failures.map(([source,error])=>({source:String(source),error})));
  throw new Error("No se pudieron cargar los datos del administrador.");
 }
 const settings={...DEFAULT_SETTINGS,...site.data,...payment.data} as Settings;
 return <AdminDashboard initialProducts={products.data as Product[]} initialCategories={categories.data as Category[]} initialOrders={ordersPage.items as Order[]} initialOrderCursor={ordersPage.nextCursor} initialWhatsAppRequests={requestsPage.items} initialRequestCursor={requestsPage.nextCursor} initialZones={zones.data as ShippingZone[]} initialSettings={settings} initialBanners={banners.data as Banner[]}/>;
}
