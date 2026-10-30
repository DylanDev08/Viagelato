/** Limit bytes while reading, including chunked requests without Content-Length. */
export class RequestBodyError extends Error {
 constructor(message:string,public status:number){super(message);}
}

export async function readJsonBody(request:Request,maxBytes=16000):Promise<unknown>{
 const type=request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
 if(type!=="application/json")throw new RequestBodyError("El cuerpo debe enviarse como JSON",415);
 const length=request.headers.get("content-length");
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))
  throw new RequestBodyError("Solicitud demasiado extensa",413);
 const reader=request.body?.getReader();
 if(!reader)throw new RequestBodyError("Solicitud vacía",400);
 const chunks:Uint8Array[]=[];
 let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();throw new RequestBodyError("Solicitud demasiado extensa",413);}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
 catch{throw new RequestBodyError("Formato de solicitud inválido",400);}
}
