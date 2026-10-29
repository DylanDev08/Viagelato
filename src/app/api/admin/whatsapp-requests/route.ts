import {NextResponse} from "next/server";
import {z} from "zod";
import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {adminRequestError} from "@/lib/admin";

const schema=z.object({
 id:z.uuid(),
 action:z.enum(["contacted","confirmed","preparing","shipped","delivered","cancel","mark_paid"])
});
export async function PATCH(request:Request){
 const blocked=adminRequestError(request);
 if(blocked)return blocked;
 let admin;
 try{admin=await assertAdmin();}catch{return NextResponse.json({error:"No autorizado"},{status:401});}
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Acción o referencia inválida"},{status:400});
 const {data,error}=await privilegedDb().rpc("admin_update_whatsapp_request",{
  p_request_id:parsed.data.id,p_action:parsed.data.action,p_actor_user_id:admin.id
 });
 if(error)return NextResponse.json({error:"No se pudo avanzar la solicitud. Revisá su estado actual y la acreditación del pago."},{status:409});
 if(data!==true)return NextResponse.json({error:"La solicitud ya no existe"},{status:404});
 return NextResponse.json({updated:true},{headers:{"Cache-Control":"no-store"}});
}
