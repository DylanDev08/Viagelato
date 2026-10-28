import {NextResponse} from "next/server";
import {z} from "zod";
import {adminOrError} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const safeUrl=z.union([z.url().refine(value=>value.startsWith("https://")||value.startsWith("http://"),"Usá una URL HTTPS o HTTP"),z.literal("")]);
const schema=z.object({name:z.string().min(2).max(140),description:z.string().max(1500),logo_url:safeUrl.nullable(),whatsapp:z.string().max(40),phone:z.string().max(40),instagram:safeUrl,address:z.string().max(280),maps_url:safeUrl,contact_email:z.union([z.email(),z.literal("")]),hero_title:z.string().min(2).max(180),hero_subtitle:z.string().max(300),hero_image_url:safeUrl.nullable(),returns_policy:z.string().max(10000),privacy_policy:z.string().max(10000),bank_alias:z.string().max(100),bank_cbu:z.string().max(35),bank_holder:z.string().max(140),free_shipping_threshold:z.number().positive().max(100000000),pickup_enabled:z.boolean(),transfer_enabled:z.boolean(),on_delivery_enabled:z.boolean(),reservation_minutes:z.number().int().min(10).max(1440)}).superRefine((value,ctx)=>{if(value.transfer_enabled&&(!value.bank_alias||!value.bank_cbu||!value.bank_holder))ctx.addIssue({code:"custom",path:["transfer_enabled"],message:"Completá alias, CBU/CVU y titular antes de habilitar transferencias"});});

export async function PUT(request:Request){
 const auth=await adminOrError();if(auth)return auth;
 const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Configuración inválida",issues:parsed.error.issues},{status:400});
 const {bank_alias,bank_cbu,bank_holder,...publicSettings}=parsed.data;const db=privilegedDb();
 const [site,payment]=await Promise.all([
  db.from("site_settings").update({...publicSettings,logo_url:publicSettings.logo_url||null,hero_image_url:publicSettings.hero_image_url||null}).eq("id",true).select().single(),
  db.from("payment_settings").update({bank_alias,bank_cbu,bank_holder}).eq("id",true).select().single(),
 ]);
 if(site.error||payment.error)return NextResponse.json({error:"No se pudo guardar la configuración"},{status:400});
 return NextResponse.json({...site.data,...payment.data});
}
