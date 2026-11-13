import "server-only";
import {createServerClient,type CookieOptions} from "@supabase/ssr";
import {NextRequest,NextResponse} from "next/server";
import {adminServerCookieOptions,isServerAdminCookie} from "./admin-session-cookies";

type PendingCookie={name:string;value:string;options:CookieOptions};
/** Isolated server-owned Supabase session. No token is returned in JSON. */
export function adminLoginSession(request:NextRequest){
 const pending=new Map<string,PendingCookie>();
 const refreshHeaders=new Headers();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
 const client=createServerClient(url,key,{
  cookieOptions:adminServerCookieOptions(),
  cookies:{
   getAll(){return request.cookies.getAll().filter(c=>isServerAdminCookie(c.name));},
   setAll(changes,headers){
    for(const {name,value,options} of changes){
     if(!isServerAdminCookie(name))continue;
     request.cookies.set(name,value);
     pending.set(name,{name,value,options});
    }
    if(headers)for(const [name,value] of Object.entries(headers)){
     if(["cache-control","expires","pragma"].includes(name.toLowerCase())&&typeof value==="string")
      refreshHeaders.set(name,value);
    }
   }
  }
 });
 function response(data:Record<string,unknown>,status=200){
  const result=NextResponse.json(data,{status,headers:{
   "Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"
  }});
  // Set-Cookie must be written onto the ACTUAL returned response.
  for(const item of pending.values()){
   result.cookies.set(item.name,item.value,{
    ...item.options,
    httpOnly:true,
    sameSite:"lax",
    secure:process.env.NODE_ENV==="production",
    path:"/"
   });
  }
  for(const header of ["cache-control","expires","pragma"]){
   const value=refreshHeaders.get(header);
   if(value)result.headers.set(header,value);
  }
  // Even when auth refreshes cookies, a login response must not be cacheable.
  result.headers.set("Cache-Control","private, no-store");
  return result;
 }
 function clear(){
  for(const cookie of request.cookies.getAll().filter(c=>isServerAdminCookie(c.name))){
   pending.set(cookie.name,{
    name:cookie.name,value:"",options:{...adminServerCookieOptions(),maxAge:0}
   });
  }
 }
 return {client,response,clear};
}
