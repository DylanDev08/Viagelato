import {NextResponse} from "next/server";
import {z} from "zod";
import {assertAdmin,privilegedDb} from "@/lib/supabase";
import {adminRequestError} from "@/lib/admin";

const statusAction=z.object({
 id:z.uuid(),
 action:z.enum(["contacted","confirmed","preparing","shipped","delivered","cancel"])
}).strict();
const termsAction=z.object({
 id:z.uuid(),
 action:z.literal("confirm_terms"),
 stock_confirmed:z.literal(true),
 shipping_cost:z.number().finite().min(0).max(10000000),
}).strict();
const paymentAction=z.object({
 id:z.uuid(),
 action:z.literal("record_payment"),
 amount:z.number().finite().positive().max(100000000),
 payment_key:z.uuid(),
 transfer_reference:z.string().trim().max(100).default(""),
}).strict();
const cashAction=z.object({
 id:z.uuid(),
 action:z.literal("record_cash"),
 amount:z.number().finite().positive().max(100000000),
 payment_key:z.uuid(),
}).strict();
const schema=z.discriminatedUnion("action",[statusAction,termsAction,paymentAction,cashAction]);

export async function PATCH(request:Request){
 const blocked=adminRequestError(request);
 if(blocked)return blocked;
 let admin;
 try{admin=await assertAdmin();}catch{return NextResponse.json({error:"No autorizado"},{status:401});}
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Acción, importe o referencia inválidos"},{status:400});
 const input=parsed.data;
 const db=privilegedDb();
 let result;
 if(input.action==="confirm_terms"){
  result=await db.rpc("admin_confirm_whatsapp_terms",{
   p_request_id:input.id,p_actor_user_id:admin.id,p_stock_confirmed:true,p_shipping_cost:input.shipping_cost
  });
 }else if(input.action==="record_payment"){
  result=await db.rpc("admin_record_whatsapp_payment",{
   p_request_id:input.id,p_actor_user_id:admin.id,
   p_amount:input.amount,p_payment_key:input.payment_key,
   p_transfer_reference:input.transfer_reference
  });
 }else if(input.action==="record_cash"){
  result=await db.rpc("admin_record_whatsapp_cash",{
   p_request_id:input.id,p_actor_user_id:admin.id,
   p_amount:input.amount,p_payment_key:input.payment_key
  });
 }else{
  result=await db.rpc("admin_update_whatsapp_request",{
   p_request_id:input.id,p_action:input.action,p_actor_user_id:admin.id
  });
 }
 if(result.error)return NextResponse.json({
  error:"No se pudo completar la operación. Verificá el estado, el stock, el envío y el saldo pendiente."
 },{status:409,headers:{"Cache-Control":"no-store"}});
 if(result.data!==true)return NextResponse.json({error:"La solicitud ya no existe"},{status:404});
 return NextResponse.json({updated:true},{headers:{"Cache-Control":"no-store"}});
}
