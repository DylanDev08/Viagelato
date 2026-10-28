import {NextResponse} from "next/server";
import {z} from "zod";
import {privilegedDb,assertAdmin} from "@/lib/supabase";
import {adminRequestError} from "@/lib/admin";
const schema=z.discriminatedUnion("action",[
 z.object({id:z.uuid(),action:z.literal("mark_paid")}),
 z.object({id:z.uuid(),action:z.literal("cancel")}),
 z.object({id:z.uuid(),action:z.literal("set_status"),status:z.enum(["preparing","shipped","delivered"])})
]);
export async function PATCH(req:Request){
 const originError=adminRequestError(req);if(originError)return originError;
 let user;try{user=await assertAdmin();}catch{return NextResponse.json({error:"No autorizado"},{status:401});}
 const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Acción inválida"},{status:400});
 const {data,error}=await privilegedDb().rpc("admin_update_order",{p_order_id:p.data.id,p_action:p.data.action,p_next_status:p.data.action==="set_status"?p.data.status:null,p_actor_user_id:user.id});
 if(error||data!==true)return NextResponse.json({error:"No se pudo actualizar el pedido. Revisá su estado actual y volvé a intentarlo."},{status:409});
 return NextResponse.json({updated:true},{headers:{"Cache-Control":"no-store"}});
}
