"use client";
import {type FormEvent,useState} from "react";
import Link from "next/link";
import {browserDb} from "@/lib/browser";
import {recoveryError} from "@/lib/recovery-errors";

export default function ForgotPassword(){
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [error,setError]=useState("");
 const [blocked,setBlocked]=useState(false);
 async function submit(e:FormEvent){
  e.preventDefault();
  if(busy||blocked)return;
  setBusy(true);setError("");
  try{
   const {error:failure}=await browserDb().auth.resetPasswordForEmail(email.trim(),{
    redirectTo:`${window.location.origin}/actualizar-contrasena`
   });
   if(failure)throw failure;
   setSent(true);
  }catch(e){
   const problem=recoveryError(e);
   setError(problem.message);
   if(problem.kind==="rate_limited")setBlocked(true);
  }finally{setBusy(false);}
 }
 return <main className="auth-shell"><form className="panel auth-panel auth-recovery-panel" onSubmit={submit}>
  <h1>Recuperar acceso</h1>
  <p>Ingresá el email de tu cuenta administrativa. Vas a recibir un enlace para elegir una nueva contraseña.</p>
  {sent?<div className="auth-success" role="status"><strong>Revisá tu correo electrónico.</strong><p>Si la cuenta existe, vas a recibir un enlace de recuperación. Revisá también Spam. Usá el enlace más reciente.</p><p>El enlace debe abrir esta misma tienda, no localhost. Si no es así, revisá las URLs de Supabase Auth.</p></div>:<>
   <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label>
   {error&&<p className="error" role="alert">{error}</p>}
   <button className="btn primary full" type="submit" disabled={busy||blocked}>{busy?"Enviando…":blocked?"Envío limitado temporalmente":"Enviar enlace de recuperación"}</button>
  </>}
  <Link href="/login">← Volver a iniciar sesión</Link>
 </form></main>;
}
