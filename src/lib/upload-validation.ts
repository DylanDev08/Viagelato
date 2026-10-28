/** Inspección de la firma de imágenes antes de entregarlas a Storage. */
export const MAX_UPLOAD_SIZE=3_000_000;
export type UploadType="image/jpeg"|"image/png"|"image/webp";
export type UploadValidation={ok:true;extension:"jpg"|"png"|"webp"}|{ok:false;error:string};
const match=(bytes:Uint8Array,start:number,signature:number[])=>signature.every((part,index)=>bytes[start+index]===part);
const ascii=(bytes:Uint8Array,start:number,s:string)=>[...s].every((char,index)=>bytes[start+index]===char.charCodeAt(0));

export function validateUploadedImage(mime:string,size:number,bytes:Uint8Array):UploadValidation{
 if(!Number.isSafeInteger(size)||size<=0||size>MAX_UPLOAD_SIZE||bytes.length!==size){
  return {ok:false,error:"Subí JPG, PNG o WEBP de hasta 3 MB"};
 }
 if(mime==="image/jpeg"&&bytes.length>=4&&match(bytes,0,[0xff,0xd8,0xff])&&match(bytes,bytes.length-2,[0xff,0xd9])){
  return {ok:true,extension:"jpg"};
 }
 if(mime==="image/png"&&bytes.length>=33&&match(bytes,0,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])&&
    match(bytes,8,[0,0,0,13])&&ascii(bytes,12,"IHDR")){
  return {ok:true,extension:"png"};
 }
 if(mime==="image/webp"&&bytes.length>=20&&ascii(bytes,0,"RIFF")&&ascii(bytes,8,"WEBP")&&
   ["VP8 ","VP8L","VP8X"].some(chunk=>ascii(bytes,12,chunk))){
  return {ok:true,extension:"webp"};
 }
 return {ok:false,error:"El contenido del archivo no coincide con un JPG, PNG o WEBP válido"};
}
