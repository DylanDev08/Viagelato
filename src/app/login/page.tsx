"use client";
import {type FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/browser";

export default function Login(){
 const[email,setEmail]=useState("");
 const[password,setPassword]=useState("");
 const[error,setError]=useState("");
 const[busy,setBusy]=useState(false);
 const router=useRouter();

 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;
  setBusy(true);setError("");
  try{
   const client=browserDb();
   const {error:signInError}=await client.auth.signInWithPassword({email:email.trim(),password});
   if(signInError)throw new Error("No se pudo ingresar. Revisá el email y la contraseña.");
   const response=await fetch("/api/admin/session",{cache:"no-store",credentials:"same-origin"});
   if(response.status===401||response.status===403){
    await client.auth.signOut();
    throw new Error("La cuenta ingresó correctamente, pero no tiene permiso de administrador.");
   }
   if(!response.ok)throw new Error("No se pudo verificar el acceso administrativo. Probá nuevamente.");
   router.replace("/admin");
   router.refresh();
  }catch(err){
   setError(err instanceof Error?err.message:"Error de acceso");
  }finally{setBusy(false);}
 }
 return <main className="auth-shell"><form className="panel auth-panel" onSubmit={submit}>
  <h1>Acceso administrador</h1>
  <p>Ingresá con una cuenta autorizada de Supabase para administrar Viagelato.</p>
  <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
  <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  <button disabled={busy} className="btn primary full">{busy?"Verificando acceso…":"Ingresar"}</button>
  <Link href="/">← Volver a la tienda</Link>
 </form></main>;
}
