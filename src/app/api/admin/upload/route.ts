import {NextResponse} from "next/server";
import {adminOrError} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";
import {MAX_UPLOAD_SIZE,validateUploadedImage} from "@/lib/upload-validation";
import {RequestBodyError,readLimitedFormData} from "@/lib/request-body";

export const runtime="nodejs";
export async function POST(request:Request){
 const auth=await adminOrError(request);
 if(auth)return auth;
 let form:FormData;
 try{form=await readLimitedFormData(request,MAX_UPLOAD_SIZE+64_000);}catch(error){
  const status=error instanceof RequestBodyError?error.status:400;
  return NextResponse.json({error:status===413?"La carga supera el tamaño permitido":"Formulario de imagen inválido"},{status});
 }
 const file=form.get("file");
 if(!(file instanceof File))return NextResponse.json({error:"Seleccioná una imagen válida"},{status:400});
 if(file.size===0||file.size>MAX_UPLOAD_SIZE)return NextResponse.json({error:"Subí JPG, PNG o WEBP de hasta 3 MB"},{status:400});

 const bytes=new Uint8Array(await file.arrayBuffer());
 const result=validateUploadedImage(file.type,file.size,bytes);
 if(!result.ok)return NextResponse.json({error:result.error},{status:400});

 const name=`${crypto.randomUUID()}.${result.extension}`;
 const db=privilegedDb();
 const {error}=await db.storage.from("images").upload(name,bytes,{
  contentType:file.type,upsert:false,cacheControl:"31536000"
 });
 if(error)return NextResponse.json({error:"No se pudo guardar la imagen"},{status:400});
 const {data}=db.storage.from("images").getPublicUrl(name);
 return NextResponse.json({url:data.publicUrl},{headers:{"Cache-Control":"no-store"}});
}
