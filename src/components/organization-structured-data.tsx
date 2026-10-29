import type {Settings} from "@/lib/types";

function safeHttpUrl(value:string|undefined):string|null{
 try{
  if(!value)return null;
  const url=new URL(value);
  return url.protocol==="https:"||url.hostname==="localhost"?url.href:null;
 }catch{return null;}
}

/** Datos verificados desde configuración; nunca agrega reseñas, precios ni sucursales. */
export function OrganizationStructuredData({settings}:{settings:Settings}){
 const site=safeHttpUrl(process.env.NEXT_PUBLIC_SITE_URL);
 const instagram=safeHttpUrl(settings.instagram);
 const absoluteLogo=safeHttpUrl(settings.logo_url??undefined);
 const logo=absoluteLogo??(site&&settings.logo_url?.startsWith("/")?new URL(settings.logo_url,site).href:null);
 const data={
  "@context":"https://schema.org",
  "@type":"Organization",
  name:settings.name,
  ...(site?{url:site}:{}),
  ...(logo?{logo}:{}),
  ...(settings.phone||settings.contact_email?{contactPoint:{
   "@type":"ContactPoint",contactType:"customer service",
   ...(settings.phone?{telephone:settings.phone}:{}),
   ...(settings.contact_email?{email:settings.contact_email}:{}),
   availableLanguage:"Spanish",
  }}:{}),
  ...(settings.address.trim()?{address:{"@type":"PostalAddress",streetAddress:settings.address,addressCountry:"AR"}}:{}),
  ...(instagram?{sameAs:[instagram]}:{}),
 };
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}
