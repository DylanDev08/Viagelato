"use client";
import {type FormEvent,useState} from "react";
import Link from "next/link";
import {Eye,EyeOff,LockKeyhole} from "lucide-react";
import {useRouter} from "next/navigation";
import {TurnstileChallenge} from "@/components/turnstile-challenge";

export default function Login(){
 const[email,setEmail]=useState("");
 const[password,setPassword]=useState("");
 const[error,setError]=useState("");
 const[busy,setBusy]=useState(false);
 const[showPassword,setShowPassword]=useState(false);
 const[turnstileToken,setTurnstileToken]=useState("");
 const[challengeVersion,setChallengeVersion]=useState(0);
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??"";
 const router=useRouter();

 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/auth/admin-login",{
    method:"POST",headers:{"Content-Type":"application/json"},
    credentials:"same-origin",cache:"no-store",
    body:JSON.stringify({email:email.trim(),password,turnstile_token:turnstileToken||undefined})
   });
   const result=await response.json().catch(()=>({error:"No se pudo verificar el acceso."}));
   if(!response.ok)throw new Error(
    response.status===401?"No se pudo ingresar. Revisá el email, la contraseña y los permisos.":
    response.status===429?"Demasiados intentos de acceso. Probá más tarde.":
    result.error||"No se pudo verificar el acceso administrativo."
   );
   // Segundo control: la cookie de sesión debe ser válida ante la API protegida.
   const verify=await fetch("/api/admin/session",{cache:"no-store",credentials:"same-origin"});
   if(!verify.ok)throw new Error("No se pudo confirmar la sesión de administrador.");
   router.replace("/admin");
   router.refresh();
  }catch(err){
   setError(err instanceof Error?err.message:"Error de acceso");
  }finally{setBusy(false);if(siteKey){setTurnstileToken("");setChallengeVersion(v=>v+1);}}
 }
 return <main className="auth-shell"><form className="panel auth-panel" onSubmit={submit}>
  <div className="admin-login-heading"><LockKeyhole size={24} aria-hidden="true"/><span>VIAGELATO · PANEL</span></div>
  <h1>Acceso administrador</h1>
  <p>Gestioná los productos, pedidos y mensajes de WhatsApp desde tu celular.</p>
  <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
  <label>Contraseña<div className="admin-password-input"><input type={showPassword?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="admin-password-toggle" type="button" aria-label={showPassword?"Ocultar contraseña":"Mostrar contraseña"} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={20} aria-hidden="true"/>:<Eye size={20} aria-hidden="true"/>}</button></div></label>
  <p className="auth-help"><Link href="/recuperar-acceso">¿Olvidaste tu contraseña? Recuperar acceso</Link></p>
  {error&&<p className="error" role="alert">{error}</p>}
  {siteKey?<TurnstileChallenge key={challengeVersion} siteKey={siteKey} action="admin_login" onTokenChange={setTurnstileToken}/>:null}
  <button disabled={busy||Boolean(siteKey&&!turnstileToken)} className="btn primary full">{busy?"Verificando acceso…":"Ingresar"}</button>
  <Link href="/">← Volver a la tienda</Link>
 </form></main>;
}
