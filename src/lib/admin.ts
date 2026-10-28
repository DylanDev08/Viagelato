import {NextResponse} from "next/server";
import {assertAdmin} from "./supabase";
import {isAllowedAdminMutation} from "./admin-origin";
export {bannerSchema,productSchema,settingsSchema,zoneSchema} from "./admin-rules";

export function adminRequestError(request:Request){
 if(!isAllowedAdminMutation(request))return NextResponse.json({error:"Origen no permitido"},{status:403});
 return null;
}

export async function adminOrError(request?:Request){
 if(request){const originError=adminRequestError(request);if(originError)return originError;}
 try{await assertAdmin();return null;}catch{return NextResponse.json({error:"No autorizado"},{status:401});}
}
