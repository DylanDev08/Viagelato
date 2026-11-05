import {createServerClient,type CookieOptions} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

/** Fast authentication gate before any privileged route is rendered.
 * assertAdmin() on the page/API remains authoritative for admin_users roles.
 */
export async function proxy(request:NextRequest){
 const api=request.nextUrl.pathname.startsWith("/api/admin");
 function unauthorized(){
  if(api)return NextResponse.json({error:"No autorizado"},{
   status:401,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"}
  });
  const redirected=NextResponse.redirect(new URL("/login",request.url));
  redirected.headers.set("Cache-Control","private, no-store");
  return redirected;
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return unauthorized();
 let response=NextResponse.next({request});
 const supabase=createServerClient(url,key,{
  cookies:{
   getAll(){return request.cookies.getAll();},
   setAll(items:{name:string;value:string;options:CookieOptions}[]){
    items.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   }
  }
 });
 try{
  const {data,error}=await supabase.auth.getClaims();
  if(error||!data?.claims?.sub)return unauthorized();
 }catch{return unauthorized();}
 response.headers.set("Cache-Control","private, no-store");
 response.headers.set("X-Robots-Tag","noindex, nofollow");
 return response;
}
export const config={matcher:["/admin/:path*","/api/admin/:path*"]};
