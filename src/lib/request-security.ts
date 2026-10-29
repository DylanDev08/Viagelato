import {isIP} from "node:net";

type JsonReadResult=
 | {ok:true;value:unknown}
 | {ok:false;reason:"content-type"|"empty"|"too-large"|"invalid"};

const localHost=(hostname:string)=>hostname==="localhost"||hostname==="127.0.0.1"||hostname==="[::1]";

function safeOrigin(raw:string):string|null{
 try{
  const value=new URL(raw.trim());
  if(value.origin==="null"||value.username||value.password||value.pathname!=="/"||value.search||value.hash)return null;
  if(value.protocol!=="https:"&&!localHost(value.hostname))return null;
  return value.origin;
 }catch{return null;}
}

/** Protege mutaciones iniciadas por navegador, incluso detrás de Vercel/Render. */
export function isAllowedMutationOrigin(
 request:Request,
 siteUrl=process.env.NEXT_PUBLIC_SITE_URL,
 extraOrigins=process.env.MUTATION_ALLOWED_ORIGINS||process.env.ADMIN_ALLOWED_ORIGINS,
):boolean{
 if(request.headers.get("sec-fetch-site")==="cross-site")return false;
 const requested=request.headers.get("origin");
 if(!requested)return false;
 const requestedOrigin=safeOrigin(requested);
 if(!requestedOrigin)return false;

 const allowed=new Set<string>();
 for(const raw of [new URL(request.url).origin,siteUrl,...(extraOrigins?.split(",")??[])]){
  if(!raw)continue;
  const origin=safeOrigin(raw);
  if(origin)allowed.add(origin);
 }
 return allowed.has(requestedOrigin);
}

/** Usa el último X-Forwarded-For válido para ignorar valores antepuestos por el cliente. */
export function clientAddress(request:Request):string{
 const real=request.headers.get("x-real-ip")?.trim();
 if(real&&isIP(real))return real;
 const forwarded=(request.headers.get("x-forwarded-for")??"").split(",").map(value=>value.trim()).filter(Boolean);
 for(let index=forwarded.length-1;index>=0;index--){
  if(isIP(forwarded[index]!))return forwarded[index]!;
 }
 return "unknown";
}

/** Lee JSON por streaming y corta antes de conservar cuerpos demasiado grandes. */
export async function readLimitedJson(request:Request,maxBytes=16_000):Promise<JsonReadResult>{
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return {ok:false,reason:"content-type"};
 const declared=Number(request.headers.get("content-length"));
 if(Number.isFinite(declared)&&declared>maxBytes)return {ok:false,reason:"too-large"};
 if(!request.body)return {ok:false,reason:"empty"};
 const reader=request.body.getReader();
 const chunks:Uint8Array[]=[];
 let total=0;
 while(true){
  const {done,value}=await reader.read();
  if(done)break;
  total+=value.byteLength;
  if(total>maxBytes){await reader.cancel();return {ok:false,reason:"too-large"};}
  chunks.push(value);
 }
 if(total===0)return {ok:false,reason:"empty"};
 const bytes=new Uint8Array(total);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return {ok:true,value:JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes))};}
 catch{return {ok:false,reason:"invalid"};}
}
