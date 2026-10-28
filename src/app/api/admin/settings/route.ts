import {NextResponse} from "next/server";
import {adminOrError,settingsSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

export async function PUT(request:Request){
 const auth=await adminOrError(request);if(auth)return auth;
 const parsed=settingsSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Configuración inválida",issues:parsed.error.issues},{status:400});
 const {bank_alias,bank_cbu,bank_holder,...publicSettings}=parsed.data;const db=privilegedDb();
 const [site,payment]=await Promise.all([
  db.from("site_settings").update({...publicSettings,logo_url:publicSettings.logo_url||null,hero_image_url:publicSettings.hero_image_url||null}).eq("id",true).select().single(),
  db.from("payment_settings").update({bank_alias,bank_cbu,bank_holder}).eq("id",true).select().single(),
 ]);
 if(site.error||payment.error)return NextResponse.json({error:"No se pudo guardar la configuración"},{status:400});
 return NextResponse.json({...site.data,...payment.data});
}
