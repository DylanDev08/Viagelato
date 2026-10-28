import type { NextConfig } from "next";

/**
 * Sólo en Vercel: enviar /api/* al servicio Render.
 * Render no debe definir API_ORIGIN; así evita proxy recursivo.
 * No redirigir páginas, autenticación SSR ni recursos estáticos.
 */
const backendOrigin = process.env.API_ORIGIN?.trim();

function apiRewrites() {
  if (!backendOrigin) return [];
  const url = new URL(backendOrigin);
  if (url.protocol !== "https:" || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("API_ORIGIN debe ser un origen HTTPS, sin ruta ni query");
  }
  return [{
    source: "/api/:path*",
    destination: `${url.origin}/api/:path*`,
  }];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return apiRewrites();
  },
};
export default nextConfig;
