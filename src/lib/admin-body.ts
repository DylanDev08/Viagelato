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
