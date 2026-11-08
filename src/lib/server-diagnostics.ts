/**
 * Diagnósticos sin proveedores pagos y sin filtrar PII a logs de Vercel.
 * Nunca registrar payload, error.message, stack, cabeceras, cookies,
 * correo, dirección, número telefónico ni contenido de WhatsApp.
 */
export type ServerEvent="admin_data_load_failed"|"whatsapp_prepare_failed";
export type DataSource=
 "products"|"categories"|"orders"|"shipping_zones"|"site_settings"|
 "payment_settings"|"banners"|"whatsapp_order_requests"|"unknown";
const sources=new Set<DataSource>([
 "products","categories","orders","shipping_zones","site_settings",
 "payment_settings","banners","whatsapp_order_requests","unknown"
]);

export function safeDatabaseCode(value:unknown):string{
 if(!value||typeof value!=="object"||!("code" in value))return "unknown";
 const code=(value as {code?:unknown}).code;
 return typeof code==="string"&&/^[0-9A-Z]{5}$/.test(code)?code:"unknown";
}

/** Solo se admiten eventos, códigos SQLSTATE y nombres de tabla conocidos. */
export function reportServerFailure(
 event:ServerEvent,
 failures:ReadonlyArray<{source:string;error:unknown}>=[]
):void{
 const safe=failures.map(({source,error})=>({
  source:sources.has(source as DataSource)?source:"unknown",
  code:safeDatabaseCode(error)
 }));
 console.error("viagelato.server",JSON.stringify({event,failures:safe}));
}
