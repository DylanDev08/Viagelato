import type { NextConfig } from "next";

/**
 * Vercel y Render comparten dominio público, pero /admin se renderiza
 * en Vercel. Las mutaciones del administrador deben ejecutarse en el
 * mismo servidor que comprueba la sesión y consulta Supabase: así no
 * se mezclan versiones del panel y de la API durante los despliegues.
 *
 * Solo el backend público de health/checkout/cron sigue usando Render.
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

const renderRoutes=["/api/health","/api/checkout","/api/cron/:path*"] as const;

const nextConfig:NextConfig={
  reactStrictMode:true,
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
