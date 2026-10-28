import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Reject example placeholders so that copying .env.example leaves demo mode intact. */
export function connected() {
 const rawUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
 const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!rawUrl||!publishable||!secret) return false;
 try {
  const parsed=new URL(rawUrl);
  if(parsed.protocol!=="https:"||!/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname)) return false;
  if(parsed.hostname.startsWith("tu-proyecto.")||parsed.hostname.startsWith("your-project.")) return false;
  if(!publishable.startsWith("sb_publishable_") && !publishable.startsWith("eyJ")) return false;
  if(publishable.includes("...")||publishable.length<24) return false;
  if(secret.startsWith("TU_CLAVE")||secret.startsWith("YOUR_")||secret.includes("...")||secret.length<24) return false;
  return true;
 } catch { return false; }
}

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
 if(roleError || !admin) throw new Error("No tenés permiso de administrador");
 return user;
}
