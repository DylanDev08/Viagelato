import {NextResponse} from "next/server";
import {readJsonBody,RequestBodyError} from "./request-body";

export type AdminJsonResult={ok:true;data:unknown}|{ok:false;response:NextResponse};

/** Bound privileged requests before parsing JSON or querying with service_role. */
export async function readAdminJson(request:Request,maxBytes=64_000):Promise<AdminJsonResult>{
 try{
  const data=await readJsonBody(request,maxBytes);
  return {ok:true,data};
 }catch(error){
  if(error instanceof RequestBodyError){
   return {ok:false,response:NextResponse.json({error:error.message},{
    status:error.status,headers:{"Cache-Control":"private, no-store"}
   })};
  }
  return {ok:false,response:NextResponse.json({error:"No se pudo interpretar la solicitud"},{
   status:400,headers:{"Cache-Control":"private, no-store"}
  })};
 }
}

export type AdminUploadResult={ok:true;form:FormData}|{ok:false;response:NextResponse};

/** Limit multipart bytes while streaming, before calling formData() or storage. */
export async function readAdminUpload(request:Request,maxBytes=3_100_000):Promise<AdminUploadResult>{
 const fail=(message:string,status:number):AdminUploadResult=>({
  ok:false,response:NextResponse.json({error:message},{
   status,headers:{"Cache-Control":"private, no-store"}
  })
 });
 const type=request.headers.get("content-type")??"";
 if(!/^multipart\/form-data\s*;\s*boundary=[a-zA-Z0-9'()+_,.\/:=?-]{1,200}(?:\s*;.*)?$/i.test(type))
  return fail("Se requiere una imagen enviada como formulario",415);
 const length=request.headers.get("content-length");
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))
  return fail("El archivo supera el tamaño permitido",413);
 if(!request.body)return fail("No se recibió ningún archivo",400);
 const reader=request.body.getReader(),parts:Uint8Array[]=[];
 let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();return fail("El archivo supera el tamaño permitido",413);}
   parts.push(value);
  }
 }catch{return fail("No se pudo recibir la imagen",400);}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);
 let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 try{
  const form=await new Request(request.url,{method:"POST",headers:{"Content-Type":type},body:new Blob([bytes])}).formData();
  return {ok:true,form};
 }catch{return fail("Formulario de imagen inválido",400);}
}
