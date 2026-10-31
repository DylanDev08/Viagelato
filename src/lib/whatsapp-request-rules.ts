import {z} from "zod";

export const paymentPreferenceSchema=z.enum(["transfer","cash_on_delivery"]);
export type PaymentPreference=z.infer<typeof paymentPreferenceSchema>;
const PAYMENT_NOTE_PREFIX="Forma de pago preferida: ";

/** La solicitud existente tiene notes pero no columna de pago: guardamos la preferencia como metadato legible. */
export function paymentNotes(notes:string,preference?:PaymentPreference){
 if(!preference)return notes;
 return `${PAYMENT_NOTE_PREFIX}${preference==="transfer"?"Transferencia":"Efectivo al recibir"}${notes?"\n"+notes:""}`;
}
export function paymentFromNotes(value:string){
 const found=value.match(/^Forma de pago preferida: (Transferencia|Efectivo al recibir)(?:\n|$)/);
 if(!found)return {paymentPreference:undefined as PaymentPreference|undefined,notes:value};
 return {paymentPreference:found[1]==="Transferencia"?"transfer" as const:"cash_on_delivery" as const,notes:value.slice(found[0].length)};
}

export const whatsappRequestSchema=z.object({
 customer_name:z.string().trim().min(2).max(120),
 locality:z.string().trim().min(2).max(100),
 address:z.string().trim().max(250).default(""),
 notes:z.string().trim().max(350).default(""),
 shipping_method:z.enum(["shipping","pickup"]),
 // Opcional por compatibilidad con solicitudes y reintentos anteriores.
 payment_preference:paymentPreferenceSchema.optional(),
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
