"use client";
import Script from "next/script";
import {useEffect,useRef,useState} from "react";

type TurnstileWidget={
 render:(element:HTMLElement,options:{
  sitekey:string;action:string;theme:"light";
  callback:(token:string)=>void;
  "expired-callback":()=>void;
  "error-callback":()=>void;
 })=>string|number;
 remove:(widgetId:string|number)=>void;
};
declare global {interface Window {turnstile?:TurnstileWidget;}}

/** El usuario sólo puede continuar con el token emitido por Cloudflare.
 * Este componente no afirma haber verificado nada: la validación ocurre en el servidor.
 */
export function TurnstileChallenge({
 siteKey,action,onTokenChange
}:{
 siteKey:string;action:"admin_login"|"whatsapp_request";
 onTokenChange:(value:string)=>void;
}){
 const target=useRef<HTMLDivElement>(null);
 const [scriptReady,setScriptReady]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!siteKey||!scriptReady||!target.current||!window.turnstile)return;
  const widget=window.turnstile;
  const id=widget.render(target.current,{
   sitekey:siteKey,action,theme:"light",
   callback:(token:string)=>{setFailed(false);onTokenChange(token);},
   "expired-callback":()=>onTokenChange(""),
   "error-callback":()=>{onTokenChange("");setFailed(true);}
  });
  return ()=>{onTokenChange("");widget.remove(id);};
 },[siteKey,action,scriptReady,onTokenChange]);
 if(!siteKey)return null;
 return <div className="viagelato-turnstile" aria-label="Verificación de seguridad">
  <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
   strategy="afterInteractive" onReady={()=>setScriptReady(true)} onError={()=>setFailed(true)}/>
  <div ref={target}/>
  {failed?<p role="alert">No pudimos completar la verificación de seguridad. Recargá la página e intentá nuevamente.</p>:
   !scriptReady?<p role="status">Preparando la verificación de seguridad…</p>:null}
 </div>;
}
