import {NextResponse} from "next/server";
import {assertAdmin} from "./supabase";
export {bannerSchema,productSchema,settingsSchema,zoneSchema} from "./admin-rules";

export function adminRequestError(request:Request){
 const site=request.headers.get("sec-fetch-site");
 const origin=request.headers.get("origin");
 if(site==="cross-site")return NextResponse.json({error:"Origen no permitido"},{status:403});
 if(origin&&new URL(origin).host!==new URL(request.url).host)return NextResponse.json({error:"Origen no permitido"},{status:403});
 return null;
}

export async function adminOrError(request?:Request){
 if(request){const originError=adminRequestError(request);if(originError)return originError;}
 try{await assertAdmin();return null;}catch{return NextResponse.json({error:"No autorizado"},{status:401});}
}
