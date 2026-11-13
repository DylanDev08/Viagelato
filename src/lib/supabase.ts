import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import {adminServerCookieOptions,isServerAdminCookie} from "./admin-session-cookies";

const url=()=>process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key=()=>process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const placeholder=(value:string|undefined)=>!value || /tu-proyecto|your-project|tu_clave|generar_|\.\.\./i.test(value);
/** Público: la tienda y el catálogo no necesitan la clave privilegiada. */
export const publicConnected=()=>{
 const endpoint=url();
 const publishable=key();
 if(placeholder(endpoint)||placeholder(publishable))return false;
 try{
  const parsed=new URL(endpoint);
  return parsed.protocol==="https:"&&parsed.hostname.endsWith(".supabase.co")
   && (publishable.startsWith("sb_publishable_")||publishable.startsWith("eyJ"));
 }catch{return false;}
};
/** Exclusivo de operaciones privadas: pedidos, pagos y administración. */
export const connected=()=>{
 const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return publicConnected()&&!placeholder(serviceRole)&&Boolean(serviceRole&&serviceRole.length>=32);
};
export function publicDb(){return createClient(url(),key(),{auth:{persistSession:false}});}
/** Sólo servidor. Jamás importarlo desde componentes 'use client'. */
export function privilegedDb(){return createClient(url(),process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function userDb(){
 const jar=await cookies();
 return createServerClient(url(),key(),{cookies:{getAll(){return jar.getAll();},setAll(cs:{name:string;value:string;options:CookieOptions}[]){try{cs.forEach(({name,value,options})=>jar.set(name,value,options));}catch{ /* server component: proxy actualiza cookies */ }}}});
}
/** Server-owned, HttpOnly Supabase session for the new admin login.
 * Legacy userDb() stays available for the reversible rollout and recovery.
 */
export async function adminServerDb(){
 const jar=await cookies();
 return createServerClient(url(),key(),{
  cookieOptions:adminServerCookieOptions(),
  cookies:{
   getAll(){return jar.getAll().filter(item=>isServerAdminCookie(item.name));},
   setAll(items){
    try{
     items.forEach(({name,value,options})=>{
      if(isServerAdminCookie(name))jar.set(name,value,{
       ...options,httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/"
      });
     });
    }catch{/* Server Component: proxy refreshes cookies on the response. */}
   }
  }
 });
}

/**
 * Memoización exclusivamente por request en React Server Components.
 * El layout y la página admin pueden verificar el mismo usuario sin
 * repetir llamadas Auth + admin_users; las rutas API siguen validando
 * cada request por separado. Nunca usar un caché compartido entre usuarios.
 */
export const assertAdmin=cache(async function assertAdmin(){
 if(!connected()) throw new Error("Configurar Supabase primero");
 // Prefer the HttpOnly server session. During the canary, keep the old
 // browser session valid so existing admins are not locked out.
 let user=null;
 try{
  const server=await adminServerDb();
  const result=await server.auth.getUser();
  if(!result.error)user=result.data.user;
 }catch{/* No server session: try legacy migration path. */}
 if(!user){
  const legacy=await userDb();
  const {data,error}=await legacy.auth.getUser();
  if(error||!data.user)throw new Error("No autorizado");
  user=data.user;
 }
 const {data:admin,error:roleError}=await privilegedDb().from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(roleError || !admin) throw new Error("No tenés permiso de administrador");
 return user;
});
