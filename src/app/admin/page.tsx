import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {redirect} from "next/navigation";
import {AdminDashboard} from "@/components/admin-dashboard";
import {reportServerFailure} from "@/lib/server-diagnostics";
import {loadAdminPage} from "@/lib/admin-pagination";
import {DEFAULT_SETTINGS,type Product,type Category,type Order,type ShippingZone,type Settings,type Banner,type WhatsAppRequest} from "@/lib/types";

export default async function AdminPage(){
 try{await assertAdmin();}catch{redirect("/login");}
 const db=privilegedDb();
 const [products,categories,orders,zones,site,payment,banners,requests]=await Promise.all([
  db.from("products").select("*").order("created_at",{ascending:false}),
  db.from("categories").select("*").order("name"),
  loadAdminPage("orders").then(data=>({...data,error:null})).catch(error=>({items:[],nextCursor:null,error})), 
  db.from("shipping_zones").select("*").order("name"),
  db.from("site_settings").select("*").eq("id",true).single(),
  db.from("payment_settings").select("*").eq("id",true).single(),
  db.from("banners").select("*").order("sort_order"),
  loadAdminPage("whatsapp").then(data=>({...data,error:null})).catch(error=>({items:[],nextCursor:null,error})), 
 ]);
 const failures=[
  ["products",products.error],["categories",categories.error],["orders",orders.error],
  ["shipping_zones",zones.error],["site_settings",site.error],
  ["payment_settings",payment.error],["banners",banners.error],["whatsapp_order_requests",requests.error],
 ].filter((entry)=>entry[1]!==null);
 if(failures.length){
  reportServerFailure("admin_data_load_failed",failures.map(([source,error])=>({source:String(source),error})));
  throw new Error("No se pudieron cargar los datos del administrador.");
 }
 const settings={...DEFAULT_SETTINGS,...site.data,...payment.data} as Settings;
 return <AdminDashboard initialProducts={products.data as Product[]} initialCategories={categories.data as Category[]} initialOrders={orders.items as Order[]} initialOrdersNextCursor={orders.nextCursor} initialWhatsAppRequests={requests.items as WhatsAppRequest[]} initialWhatsAppNextCursor={requests.nextCursor} initialZones={zones.data as ShippingZone[]} initialSettings={settings} initialBanners={banners.data as Banner[]}/>;
}
