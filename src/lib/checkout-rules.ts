import {z} from "zod";

export const checkoutSchema=z.object({
 customer_name:z.string().trim().min(2).max(120),
 customer_email:z.email().max(200),
 customer_phone:z.string().trim().min(6).max(35),
 address:z.string().trim().max(250).default(""),
 postal_code:z.string().trim().max(20).default(""),
 shipping_method:z.enum(["pickup","shipping"]),
 shipping_zone_id:z.uuid().nullable(),
 payment_method:z.enum(["transfer","on_delivery"]),
 items:z.array(z.object({product_id:z.uuid(),quantity:z.number().int().min(1).max(99)})).min(1).max(40),
}).superRefine((value,ctx)=>{
 if(value.shipping_method==="shipping"&&!value.shipping_zone_id)ctx.addIssue({code:"custom",path:["shipping_zone_id"],message:"Seleccioná una zona de entrega"});
 if(value.shipping_method==="shipping"&&value.address.length<5)ctx.addIssue({code:"custom",path:["address"],message:"Completá la dirección de entrega"});
});

export type CheckoutInput=z.infer<typeof checkoutSchema>;

export function normalizeCheckout(value:CheckoutInput){
 return {...value,items:[...value.items].sort((a,b)=>a.product_id.localeCompare(b.product_id))};
}
