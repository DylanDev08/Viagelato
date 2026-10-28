import {NextResponse} from "next/server";
import {adminOrError,settingsSchema} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

export async function PUT(request:Request){
 const auth=await adminOrError(request);
 if(auth)return auth;
 const parsed=settingsSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Configuración inválida",issues:parsed.error.issues},{status:400});
 // La función SQL actualiza site_settings y payment_settings en UNA transacción:
 // o se guardan ambas filas o no se guarda ninguna.
 const {data,error}=await privilegedDb().rpc("admin_save_store_settings",{p_data:parsed.data});
 if(error || !data)return NextResponse.json({error:"No se pudo guardar la configuración completa. No se aplicaron cambios parciales."},{status:400});
 return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
}
