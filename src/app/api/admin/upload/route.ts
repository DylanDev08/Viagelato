import {NextResponse} from "next/server";
import {adminOrError} from "@/lib/admin";
import {privilegedDb} from "@/lib/supabase";

const formats={
 "image/jpeg":{extension:"jpg",matches:(bytes:Uint8Array)=>bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff},
 "image/png":{extension:"png",matches:(bytes:Uint8Array)=>[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value)},
 "image/webp":{extension:"webp",matches:(bytes:Uint8Array)=>new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP"},
} as const;

export async function POST(request:Request){
 const auth=await adminOrError();if(auth)return auth;
 const form=await request.formData();const file=form.get("file");
 if(!(file instanceof File))return NextResponse.json({error:"Falta archivo"},{status:400});
 const format=formats[file.type as keyof typeof formats];
 if(!format||file.size>3_000_000||file.size===0)return NextResponse.json({error:"Subí JPG, PNG o WEBP de hasta 3 MB"},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!format.matches(bytes))return NextResponse.json({error:"El contenido del archivo no coincide con el tipo de imagen"},{status:400});
 const name=`${crypto.randomUUID()}.${format.extension}`;const db=privilegedDb();
 const {error}=await db.storage.from("images").upload(name,bytes,{contentType:file.type,upsert:false,cacheControl:"31536000"});
 if(error)return NextResponse.json({error:"No se pudo guardar la imagen"},{status:400});
 const {data}=db.storage.from("images").getPublicUrl(name);return NextResponse.json({url:data.publicUrl});
}
