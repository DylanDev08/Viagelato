import type { NextConfig } from "next";

/**
 * En Vercel, ejecutar todas las rutas /api/* en Render.
 * "beforeFiles" es obligatorio: las rutas /api de Next.js existen también
 * en el bundle Vercel y el rewrite simple puede perder la precedencia.
 * No configurar API_ORIGIN en Render (evita bucles).
 */
const backendOrigin=process.env.API_ORIGIN?.trim();

function getBackendOrigin(){
  if(!backendOrigin) return null;
  const u=new URL(backendOrigin);
  if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash){
    throw new Error("API_ORIGIN debe ser un origen HTTPS sin ruta ni parámetros");
  }
  return u.origin;
}
const origin=getBackendOrigin();

const nextConfig:NextConfig={
  reactStrictMode:true,
  async rewrites(){
    return {
      beforeFiles: origin ? [{source:"/api/:path*",destination:`${origin}/api/:path*`}] : [],
      afterFiles:[],
      fallback:[],
    };
  },
};
export default nextConfig;
