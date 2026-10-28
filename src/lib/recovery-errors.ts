/** Interpretación segura de fallos de recuperación, sin exponer datos del usuario. */
export function recoveryError(error:unknown):{kind:"rate_limited"|"general";message:string}{
 const info=typeof error==="object"&&error!==null?error as {status?:number;code?:string;message?:string}:null;
 if(info?.status===429||info?.code==="over_email_send_rate_limit"||info?.code==="over_request_rate_limit"){
  return {kind:"rate_limited",message:"Supabase alcanzó el límite de correos de recuperación. No se envió otro mensaje. Esperá a que se restablezca el cupo (puede demorar una hora o más)."};
 }
 return {kind:"general",message:"No se pudo enviar el correo de recuperación. Comprobá tu conexión e intentá más tarde."};
}
