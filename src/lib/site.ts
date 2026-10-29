import {connected,publicDb} from "./supabase";
import {cache} from "react";
import {DEFAULT_SETTINGS,type Settings,type PublicProduct,type Category,type ShippingZone,type Banner} from "./types";
const PUBLIC_PRODUCT_COLUMNS="id,category_id,name,slug,description,price,image_url,sku,presentation,featured,commercially_verified,active,created_at";
export const getStore=cache(async()=>{
 if(!connected()) return {settings:DEFAULT_SETTINGS,products:[] as PublicProduct[],categories:[] as Category[],zones:[] as ShippingZone[],banners:[] as Banner[],demo:true,checkoutEnabled:false};
 const db=publicDb();
 const [s,p,c,z,b]=await Promise.all([
  db.from("site_settings").select("*").eq("id",true).single(),
  db.from("products").select(PUBLIC_PRODUCT_COLUMNS).eq("active",true).eq("commercially_verified",true).gt("price",0).order("created_at",{ascending:false}),
  db.from("categories").select("*").order("name"),
  db.from("shipping_zones").select("*").eq("active",true).eq("ready",true).not("cost","is",null),
  db.from("banners").select("*").eq("active",true).order("sort_order")
 ]);
 if(p.error) throw new Error("No se pudo leer el catálogo: "+p.error.message);
 return {settings:{...DEFAULT_SETTINGS,...s.data} as Settings,products:(p.data||[]) as PublicProduct[],categories:(c.data||[]) as Category[],zones:(z.data||[]) as ShippingZone[],banners:(b.data||[]) as Banner[],demo:false,checkoutEnabled:process.env.ENABLE_CHECKOUT==="true"};
});

export const getProductBySlug=cache(async(slug:string)=>{
 const store=await getStore();
 return {...store,product:store.products.find(product=>product.slug===slug)??null};
});
