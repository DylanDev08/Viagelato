"use client";
import {type FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {browserDb} from "@/lib/browser";

type RecoveryState="checking"|"ready"|"invalid"|"saved";
export default function UpdatePassword(){
 const [state,setState]=useState<RecoveryState>("checking");
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  const client=browserDb();
  let mounted=true;
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(!mounted)return;
   if(event==="PASSWORD_RECOVERY"||event==="SIGNED_IN"||event==="INITIAL_SESSION"){
    if(session?.user)setState("ready");
   }
  });
  void client.auth.getSession().then(({data:{session}})=>{
   if(!mounted)return;
   setState(v=>v==="saved"?v:session?.user?"ready":"invalid");
  }).catch(()=>{if(mounted)setState("invalid")});
  return ()=>{mounted=false;subscription.unsubscribe();};
 },[]);
 async function submit(e:FormEvent){
  e.preventDefault();if(busy||state!=="ready")return;
  setError("");
  if(password.length<12){setError("Usá una contraseña de al menos 12 caracteres.");return;}
  if(password!==confirmation){setError("Las contraseñas no coinciden.");return;}
  setBusy(true);
  try{
   const client=browserDb();
   const {error:failure}=await client.auth.updateUser({password});
   if(failure)throw failure;
   setPassword("");setConfirmation("");
   setState("saved");
   await client.auth.signOut();
  }catch{
   setError("No se pudo guardar la contraseña. Pedí otro enlace de recuperación e intentá nuevamente.");
  }finally{setBusy(false);}
 }
 return <main className="auth-shell"><section className="panel auth-panel auth-recovery-panel">
  <h1>Nueva contraseña</h1>
  {state==="checking"?<p role="status">Verificando el enlace de recuperación…</p>:
   state==="saved"?<div className="auth-success" role="status"><strong>Contraseña actualizada.</strong><p>Ya podés iniciar sesión en Viagelato con la contraseña nueva.</p><Link className="btn primary full" href="/login">Ir a iniciar sesión</Link></div>:
   state==="invalid"?<div role="alert"><p>El enlace no es válido, expiró o no generó una sesión. Solicitá uno nuevo y abrilo en este mismo navegador.</p><Link className="btn primary full" href="/recuperar-acceso">Solicitar otro enlace</Link></div>:
   <form onSubmit={submit} className="auth-recovery-form">
    <p>Elegí una contraseña nueva. No compartas esta clave con nadie ni la guardes en el código del sitio.</p>
    <label>Contraseña nueva<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/></label>
    <label>Repetir contraseña<input type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={busy}/></label>
    {error&&<p className="error" role="alert">{error}</p>}
    <button type="submit" disabled={busy} className="btn primary full">{busy?"Guardando…":"Guardar contraseña"}</button>
   </form>}
  <Link href="/login">← Volver al acceso administrativo</Link>
 </section></main>;
}
