import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const url=()=>process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key=()=>process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const placeholder=(value:string|undefined)=>!value || /tu-proyecto|your-project|tu_clave|generar_|\.\.\./i.test(value);
export const connected=()=>{
 const endpoint=url();
 const publishable=key();
 const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!serviceRole||placeholder(endpoint)||placeholder(publishable)||placeholder(serviceRole)) return false;
 try{
  const host=new URL(endpoint).hostname;
  return host.endsWith(".supabase.co") && (publishable.startsWith("sb_publishable_")||publishable.startsWith("eyJ")) && serviceRole.length>=32;
 }catch{return false;}
};
export function publicDb(){return createClient(url(),key(),{auth:{persistSession:false}});}
/** Sólo servidor. Jamás importarlo desde componentes 'use client'. */
export function privilegedDb(){return createClient(url(),process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function userDb(){
 const jar=await cookies();
 return createServerClient(url(),key(),{cookies:{getAll(){return jar.getAll();},setAll(cs:{name:string;value:string;options:CookieOptions}[]){try{cs.forEach(({name,value,options})=>jar.set(name,value,options));}catch{ /* server component: proxy actualiza cookies */ }}}});
}
export async function assertAdmin(){
 if(!connected()) throw new Error("Configurar Supabase primero");
 const client=await userDb();
 const {data:{user},error}=await client.auth.getUser();
 if(error || !user) throw new Error("No autorizado");
 const {data:admin,error:roleError}=await privilegedDb().from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(roleError) throw new Error("No se pudo verificar el permiso administrativo");
 if(!admin) throw new Error("No tenés permiso de administrador");
 return user;
}
