import {createHmac} from "node:crypto";
import {isIP} from "node:net";

/**
 * IP tomada exclusivamente del proxy confiable de Vercel. No confiar en
 * x-forwarded-for enviado arbitrariamente desde otro hosting: permite
 * evadir los límites de consultas modificando el encabezado.
 *
 * Si no existe un proxy conocido, agrupar en 'unknown' (fail closed).
 * La tasa final se valida de forma atómica mediante RPC en Supabase.
 */
export function rateLimitClientKey(request:Request,secret:string){
 if(typeof secret!=="string"||Buffer.byteLength(secret,"utf8")<32)throw new Error("Falta una clave segura para el limitador");
 const forwarded=process.env.VERCEL
  ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
  : undefined;
 const address=forwarded&&forwarded.length<=45&&isIP(forwarded)?forwarded:"unknown";
 return createHmac("sha256",secret).update(address).digest("hex");
}
