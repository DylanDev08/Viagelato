import {NextResponse} from "next/server";
import {z} from "zod";
import {privilegedDb,assertAdmin} from "@/lib/supabase";
const schema=z.discriminatedUnion("action",[
 z.object({id:z.uuid(),action:z.literal("mark_paid")}),
 z.object({id:z.uuid(),action:z.literal("cancel")}),
 z.object({id:z.uuid(),action:z.literal("set_status"),status:z.enum(["preparing","shipped","delivered"])})
]);
export async function PATCH(req:Request){
 let user;try{user=await assertAdmin();}catch{return NextResponse.json({error:"No autorizado"},{status:401});}
 const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Acción inválida"},{status:400});
 const {data,error}=await privilegedDb().rpc("admin_update_order",{p_order_id:p.data.id,p_action:p.data.action,p_next_status:p.data.action==="set_status"?p.data.status:null,p_actor_user_id:user.id});
 return error?NextResponse.json({error:error.message},{status:409}):NextResponse.json({updated:Boolean(data)});
}
