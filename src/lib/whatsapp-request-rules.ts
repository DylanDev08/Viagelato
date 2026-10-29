import {z} from "zod";

export const whatsappRequestSchema=z.object({
 customer_name:z.string().trim().min(2).max(120),
 locality:z.string().trim().min(2).max(100),
 address:z.string().trim().max(250).default(""),
 notes:z.string().trim().max(350).default(""),
 shipping_method:z.enum(["shipping","pickup"]),
 expected_subtotal:z.number().finite().nonnegative().max(1e9).optional(),
 items:z.array(z.object({
  id:z.string().regex(/^(catalog-price-(?:[2-9]|[1-3][0-9]|4[0-6])|[a-f0-9-]{36})$/i),
  quantity:z.number().int().min(1).max(99),
 })).min(1).max(30)
}).superRefine((v,ctx)=>{
 const unique=new Set(v.items.map(item=>item.id));
 if(unique.size!==v.items.length)ctx.addIssue({code:"custom",path:["items"],message:"Hay artículos repetidos en el carrito"});
});
export type WhatsAppRequestInput=z.infer<typeof whatsappRequestSchema>;
export function normalizeWhatsAppRequest(input:WhatsAppRequestInput){
 return {...input,items:[...input.items].sort((a,b)=>a.id.localeCompare(b.id))};
}
export function whatsappRequestReference(id:string){return "VIA-"+id.replaceAll("-","").slice(0,12).toUpperCase();}
