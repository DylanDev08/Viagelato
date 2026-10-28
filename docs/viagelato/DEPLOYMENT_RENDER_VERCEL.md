# Infraestructura Viagelato — estado 28/10/2026

## Topología provisional
- **Repositorio:** `DylanDev08/Viagelato`.
- **Backend Render:** [viagelato-api](https://dashboard.render.com/web/srv-dbgo1se7bikc73b5h21g), URL `https://viagelato-api.onrender.com`, plan Free, Node 22, rama `chore/viagelato-render-vercel-20261028`, autodeploy desactivado.
- **Frontend Vercel:** proyecto ya existente `viagelato`, ID `prj_clJ1QbRs3aMenIWB4XdWwTdAPJIf`, equipo `dylans-projects-554f3008`. El despliegue está bloqueado por el límite de >100 despliegues/día del plan Hobby (402, reintentar después de 24 h).
- Este MVP conserva Next.js en ambos servicios. Sólo Vercel define `API_ORIGIN`; `next.config.ts` redirige `/api/:path*` a Render. Nunca definir `API_ORIGIN` en Render para evitar bucles.

## Variables actuales
Render:
```dotenv
ENABLE_CHECKOUT=false
NEXT_TELEMETRY_DISABLED=1
NODE_VERSION=22.16.0
```
Vercel (preview + production):
```dotenv
API_ORIGIN=https://viagelato-api.onrender.com
ENABLE_CHECKOUT=false
NEXT_TELEMETRY_DISABLED=1
```

## Pendiente: Supabase exclusivo (NO usar bases FZAC)
En ambas plataformas, configurar en los entornos correspondientes:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=<URL_PROYECTO_VIAGELATO>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SECRETO_SOLO_SERVIDOR>
```
En Render, también:
```dotenv
CHECKOUT_RATE_LIMIT_SALT=<SECRETO_ALEATORIO>
CRON_SECRET=<SECRETO_ALEATORIO_DISTINTO>
```
No pegar secretos en Git, logs, capturas ni mensajes. La clave del servidor jamás debe comenzar por `NEXT_PUBLIC_`. El servicio Render debe permanecer con `ENABLE_CHECKOUT=false` hasta validar RLS, tablas, stock, pruebas y políticas.

Al tener el dominio definitivo del frontend, definir `NEXT_PUBLIC_SITE_URL` (HTTPS) en el frontend y, de ser necesario, en el backend para metadatos; luego reconstruir.

## Estado comercial
- Transferencia bancaria y pago al recibir; **sin pasarela**.
- Envío sin cargo desde $60.000 para zonas habilitadas y configuradas.
- Tarifas inferiores al mínimo, dirección, tiempos de entrega, cuenta bancaria y stock/precios reales todavía pendientes.
- 48 imágenes de catálogo provisional en `public/catalogo/` y manifest.
- Teléfono: 11 4096-2202. Instagram: [@distribuidorviagelato](https://www.instagram.com/distribuidorviagelato/).
- El logo real fue aportado como captura; para producción se necesita incorporar una imagen original limpia y accesible desde el admin o `public/` (no usar el logo de Seitu como logo comercial).

## Validaciones
- `GET /api/health` entrega 200 y los flags de configuración (sin secretos).
- `ENABLE_CHECKOUT=false` y `ENABLE_INDEXING` ausente/falso hasta lanzamiento.
- `connected()` ignora placeholders del archivo `.env.example`.
- Ejecutar `npm ci && npm run lint && npm run typecheck && npm run build` antes de merge; los logs iniciales de Render confirmaron compilación + TS para el primer commit de infraestructura.
- Revisar cookies de Supabase Auth al pasar Vercel → Render mediante rewrite, especialmente en `/api/admin/*`, antes de habilitar el panel real.
- Probar concurrencia y expiración de reservas con PostgreSQL, no sólo en modo demo.

**No habilitar checkout ni indexación antes de confirmar la operación comercial y la seguridad.**
