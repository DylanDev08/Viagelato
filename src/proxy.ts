import {createServerClient,type CookieOptions} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
import {ADMIN_SERVER_COOKIE_OPTIONS,isServerAdminCookie} from "./lib/admin-session-cookies";

/** Early auth gate; app/API assertAdmin always confirms real role via admin_users.
 * Prefer the new HttpOnly server session but keep the legacy cookie temporarily
 * during the canary. Each expired-token refresh must reach the browser.
 */
export async function proxy(request:NextRequest){
 const api=request.nextUrl.pathname.startsWith("/api/admin");
 const pending=new Map<string,{name:string;value:string;options:CookieOptions}>();
 const refreshHeaders=new Headers();
 function finish(response:NextResponse){
  for(const item of pending.values())response.cookies.set(item.name,item.value,item.options);
  for(const [name,value] of refreshHeaders)response.headers.set(name,value);
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("X-Robots-Tag","noindex, nofollow");
  return response;
 }
 function unauthorized(){
  return finish(api?NextResponse.json({error:"No autorizado"},{status:401}):
   NextResponse.redirect(new URL("/login",request.url)));
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return unauthorized();
 function client(server:boolean){
  return createServerClient(url!,key!,{
   ...(server?{cookieOptions:ADMIN_SERVER_COOKIE_OPTIONS}:{}),
   cookies:{
    getAll(){return server?
     request.cookies.getAll().filter(c=>isServerAdminCookie(c.name)):
     request.cookies.getAll().filter(c=>!isServerAdminCookie(c.name));},
    setAll(changes,headers){
     for(const {name,value,options} of changes){
      if(server&&!isServerAdminCookie(name))continue;
      const safeOptions=server?{
       ...options,httpOnly:true,sameSite:"lax" as const,
       secure:process.env.NODE_ENV==="production",path:"/"
      }:options;
      request.cookies.set(name,value);
      pending.set(name,{name,value,options:safeOptions});
     }
     if(headers){
      for(const [name,value] of Object.entries(headers)){
       if(["cache-control","expires","pragma"].includes(name.toLowerCase()))
        refreshHeaders.set(name,value);
      }
     }
    }
   }
  });
 }
 let authorized=false;
 for(const server of [true,false]){
  try{
   const {data,error}=await client(server).auth.getClaims();
   if(!error&&data?.claims?.sub){authorized=true;break;}
  }catch{/* Try the next session flavor. */}
 }
 if(!authorized)return unauthorized();
 return finish(NextResponse.next({request}));
}
export const config={matcher:["/admin/:path*","/api/admin/:path*"]};
