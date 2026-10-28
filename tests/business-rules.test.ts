import {describe,expect,it} from "vitest";
import {checkoutSchema,normalizeCheckout} from "@/lib/checkout-rules";
import {bannerSchema,productSchema,settingsSchema,zoneSchema} from "@/lib/admin-rules";

const first="00000000-0000-4000-8000-000000000001";
const second="00000000-0000-4000-8000-000000000002";
const checkout={customer_name:"Ana",customer_email:"ana@example.com",customer_phone:"1144445555",address:"",postal_code:"",shipping_method:"pickup" as const,shipping_zone_id:null,payment_method:"on_delivery" as const,items:[{product_id:second,quantity:2},{product_id:first,quantity:1}]};

describe("reglas del checkout",()=>{
 it("acepta retiro y normaliza los items para una huella estable",()=>{const parsed=checkoutSchema.parse(checkout);expect(normalizeCheckout(parsed).items.map(item=>item.product_id)).toEqual([first,second]);});
 it("rechaza cantidades fuera de rango",()=>expect(checkoutSchema.safeParse({...checkout,items:[{product_id:first,quantity:0}]}).success).toBe(false));
 it("exige dirección y zona para envío",()=>{const result=checkoutSchema.safeParse({...checkout,shipping_method:"shipping"});expect(result.success).toBe(false);if(!result.success)expect(result.error.issues.map(issue=>issue.path[0])).toEqual(expect.arrayContaining(["address","shipping_zone_id"]));});
});

describe("reglas administrativas",()=>{
 it("impide publicar productos comerciales incompletos",()=>expect(productSchema.safeParse({name:"Producto",slug:"producto",description:"",price:0,stock:1,image_url:"",category_id:null,sku:"",presentation:"",featured:false,commercially_verified:false,active:true}).success).toBe(false));
 it("impide activar zonas sin tarifa confirmada",()=>expect(zoneSchema.safeParse({name:"Zona Sur",postal_codes:[],cost:null,free_shipping_eligible:false,ready:false,active:true}).success).toBe(false));
 it("rechaza enlaces inseguros en banners",()=>expect(bannerSchema.safeParse({title:"Banner",subtitle:"",image_url:"",href:"javascript:alert(1)",active:true,sort_order:0}).success).toBe(false));
 it("exige datos bancarios completos para transferencia",()=>expect(settingsSchema.safeParse({name:"Viagelato",description:"",logo_url:"",whatsapp:"",phone:"",instagram:"",address:"",maps_url:"",contact_email:"",hero_title:"Portada",hero_subtitle:"",hero_image_url:"",returns_policy:"",privacy_policy:"",bank_alias:"",bank_cbu:"",bank_holder:"",free_shipping_threshold:1,pickup_enabled:false,transfer_enabled:true,on_delivery_enabled:false,reservation_minutes:30}).success).toBe(false));
});
