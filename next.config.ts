import type { NextConfig } from "next";
import {PRIVATE_ROUTES} from "./src/lib/seo";

/**
 * Vercel y Render comparten dominio público, pero /admin se renderiza
 * en Vercel. Las mutaciones del administrador deben ejecutarse en el
 * mismo servidor que comprueba la sesión y consulta Supabase: así no
 * se mezclan versiones del panel y de la API durante los despliegues.
 *
 * El diagnóstico /api/health y /api/checkout permanecen en Vercel.
 * El checkout heredado está retirado: POST /api/checkout devuelve 410 sin
 * consultar la base, independientemente de ENABLE_CHECKOUT. Nunca redirigirlo
 * a Render: el cron legado mantiene temporalmente su propio proxy.
 * No definir API_ORIGIN en Render (evita bucles).
 */
const backendOrigin=process.env.API_ORIGIN?.trim();

function getBackendOrigin(){
  if(!backendOrigin)return null;
  const u=new URL(backendOrigin);
  if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash){
    throw new Error("API_ORIGIN debe ser un origen HTTPS sin ruta ni parámetros");
  }
  return u.origin;
}
const origin=getBackendOrigin();

const renderRoutes=["/api/cron/:path*"] as const;

// Minimal defensive headers applied to storefront and API without restricting Next.js scripts.
export const securityHeaders=[
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
 {key:"Content-Security-Policy",value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"},
 ...(process.env.NODE_ENV==="production"?[{key:"Strict-Transport-Security",value:"max-age=31536000"}]:[]),
];

const nextConfig:NextConfig={
  reactStrictMode:true,
  async headers(){
    return [
      {source:"/:path*",headers:securityHeaders},
      {source:"/api/admin/:path*",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]},
      {source:"/api/auth/admin-login",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]},
      ...["/login","/recuperar-acceso","/actualizar-contrasena"].map(source=>({source,headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]})),
      {source:"/api/whatsapp-request",headers:[{key:"Cache-Control",value:"no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]},
      {source:"/api/checkout",headers:[{key:"Cache-Control",value:"no-store"}]},
      {source:"/api/cron/:path*",headers:[{key:"Cache-Control",value:"no-store"}]},
      ...PRIVATE_ROUTES.map(route=>({
        source:`${route}/:path*`,
        headers:[{key:"X-Robots-Tag",value:"noindex, nofollow"},{key:"Cache-Control",value:"private, no-store"}],
      })),
    ];
  },
  async rewrites(){
    return {
      beforeFiles:origin
        ? renderRoutes.map(source=>({source,destination:`${origin}${source}`}))
        : [],
      afterFiles:[],
      fallback:[],
    };
  },
};
export default nextConfig;
