/** Vínculos de WhatsApp. No asumimos que el teléfono fijo sea una línea de WhatsApp. */
export const WHATSAPP_GREETING="Hola, quiero consultar por los productos y las entregas de Viagelato.";

export function whatsappHref(raw:string|null|undefined,message=WHATSAPP_GREETING):string|null{
 const value=raw?.trim();
 if(!value)return null;
 try{
  const url=new URL(value);
  if(url.protocol!=="https:" || url.username || url.password || url.port)return null;
  const host=url.hostname.toLowerCase();
  if(host==="wa.link"&&/^\/[a-zA-Z0-9_-]{3,60}\/?$/.test(url.pathname)&&!url.search&&!url.hash){
   return url.href;
  }
  if(host==="wa.me" && /^\/[1-9][0-9]{7,14}\/?$/.test(url.pathname)&&!url.search&&!url.hash){
   return `https://wa.me/${url.pathname.replace(/\D/g,"")}?text=${encodeURIComponent(message)}`;
  }
  return null;
 }catch{
  // Solo aceptamos formato internacional explícito, como +54911XXXXXXXX.
  if(!value.startsWith("+"))return null;
  const digits=value.replace(/[^0-9]/g,"");
  if(!/^[1-9][0-9]{7,14}$/.test(digits))return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
 }
}
export function productWhatsappMessage(product:string):string{
 return `Hola, quiero consultar por ${product} y su disponibilidad en Viagelato.`;
}
