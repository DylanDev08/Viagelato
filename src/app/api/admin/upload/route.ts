import {NextResponse} from "next/server";
import {adminOrError} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";
import {MAX_UPLOAD_SIZE,validateUploadedImage} from "@/lib/upload-validation";

export const runtime="nodejs";
export async function POST(request:Request){
 const auth=await adminOrError(request);
 if(auth)return auth;
 const form=await request.formData().catch(()=>null);
 const file=form?.get("file");
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
