# Viagelato — seguridad + Cloudflare (2026-11-04)

## Estado real del proyecto

- Tienda principal: `https://viagelato.vercel.app`, desplegada en Vercel.
- Vercel solamente tiene agregado el dominio `viagelato.vercel.app`: **todavía no existe dominio propio conectado**.
- No hay conexión con una cuenta Cloudflare, zona DNS ni un widget Turnstile real.
- La nueva implementación **NO pretende que Cloudflare esté activo mientras falten esas piezas**.
- El servicio legado `viagelato-api.onrender.com` es un origen separado; una futura WAF en el dominio nuevo no bloquea accesos directos allí.

## Qué protege esta PR sin Cloudflare

1. El servidor de Vercel procesa el login de administrador y devuelve una sesión por cookies de Supabase SSR; no expone credenciales de servicio ni tokens de Auth en el JSON.
2. El login tiene un límite atómico de **5 intentos / 15 minutos** por dirección de origen hasheada (usa `CHECKOUT_RATE_LIMIT_SALT` ya existente).
3. La consulta `admin_users` valida el rol después de autenticar; no bastan email y contraseña de una cuenta de cliente.
4. El filtro de Next.js (`src/proxy.ts`) rechaza acceso sin claims a `/admin/**` y `/api/admin/**`. **No reemplaza `assertAdmin()`**, que sigue en páginas y endpoints.
5. `/login`, `/api/auth/admin-login` y recuperación de contraseña tienen `no-store` / `noindex`.
6. Carrito y API revalidan precios/stock/envío; rate limiter de pedidos ya existe.
7. Loading real de Next.js para rutas públicas y admin: el contenido aparece al terminar la carga, sin pausa artificial ni falso desafío.

## Activar Turnstile, sin dominio propio (primera etapa de Cloudflare)

En el panel Cloudflare, crear un widget Turnstile de producción, con hostname permitido
`viagelato.vercel.app`. Configurar en Vercel **Production**, como variables:

| Variable | Tipo | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Plain/public | Sitekey del widget |
| `TURNSTILE_SECRET_KEY` | Sensitive (servidor únicamente) | Secret de Siteverify |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Plain/server | `viagelato.vercel.app` |

**No pegar claves reales en GitHub ni enviarlas por chat.**

Desplegar una nueva versión de Vercel cuando las 3 variables estén configuradas. El sitio mostrará
Turnstile antes del login y antes del botón de pedidos por WhatsApp. El backend valida
`success`, `action` exacto (`admin_login` o `whatsapp_request`) y hostname autorizado
con Cloudflare Siteverify. Tokens de 5 minutos y un solo uso; los widgets se reinician
después de enviar un formulario. No se guardan tokens en pedidos ni en el identificador
de idempotencia.

**Falla segura:** si solo una de las dos claves está configurada o Siteverify falla,
el formulario protegido devuelve 403/503, no continúa sin verificación. Si ambas
están ausentes, la verificación permanece *deshabilitada* para no interrumpir
operaciones ya existentes. En ese caso, NO afirmar que Cloudflare protege pedidos.

Las pruebas automatizadas comprueban hostname, acción, presencia/ausencia de claves
y fallo de red; para certificar Turnstile real es necesario un widget verdadero y
una prueba de producción controlada.

## Activar el firewall WAF / Challenge Page en todo el sitio (segunda etapa)

**Requiere un dominio propio**, por ejemplo un dominio que el negocio ya controle.
No se puede poner el dominio `*.vercel.app` bajo una zona DNS propia.

1. Añadir el dominio comprado a Cloudflare y pasar sus nameservers a los asignados por Cloudflare.
2. Añadir el mismo dominio en Vercel → Viagelato → Settings → Domains. Seguir los valores DNS **exactos** que indique Vercel para esa verificación. No cambiar registros de correo.
3. Configurar en Cloudflare DNS el A/CNAME correspondiente y verificar TLS/HTTPS
   **Full (strict)** cuando los certificados de origen estén validados.
4. Activar **Managed WAF rules**; agregar una regla de **Managed Challenge**
   para tráfico sospechoso en `/login` y, si el tráfico lo justifica, en la tienda.
   Evitar una Challenge Page HTML aplicada sin cuidado a solicitudes AJAX POST de
   `/api/**`: allí se usa validación de Turnstile del servidor y rate limits.
5. Excluir de caché todas las rutas `/admin/**`, `/api/**`, `/login`, recuperación,
   carrito y cualquier respuesta con cookies. No cachear datos de pedidos ni sesiones.
6. Mantener abiertos `/.well-known/acme-challenge/*` y `/.well-known/vercel/*`
   para validaciones de Vercel; revisar que proxy no altere el Host.
7. Agregar el nuevo hostname al widget Turnstile, a
   `TURNSTILE_ALLOWED_HOSTNAMES`, `NEXT_PUBLIC_SITE_URL` y a la allowlist
   `ADMIN_ALLOWED_ORIGINS`. Volver a desplegar.
8. Verificar flujo completo: home, catálogo, filtros, imágenes, carrito, pedido
   por WhatsApp (sin generar uno real salvo autorización), admin + recuperación,
   y ausencia de loops de desafío.
9. Conservar `viagelato.vercel.app` para diagnóstico; recordar que la WAF en el
   dominio propio puede ser evadida con acceso directo a la URL Vercel si no se
   añade un bloqueo adicional en el origen. La validación de servidor es esencial.

Vercel advierte de posibles problemas al superponer proxies: revisar
`https://vercel.com/docs/security/reverse-proxy` y
`https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment`.
Turnstile puede usarse **sin** proxy DNS; no lo confundir con una Challenge Page.

## Alcance y reversión

- Esta PR no modifica secretos, DNS, dominio, Auth de Supabase ni RLS.
- Antes de merge: CI con tests + lint + TypeScript + PostgreSQL + build.
- Mantener las variables Turnstile ausentes hasta tener claves válidas. Si se
  activan y falla Siteverify, desactivar ambas variables y redeploy como medida
  temporal, manteniendo los límites del servidor.
- No habilitar `ENABLE_INDEXING` ni reiniciar Render por este trabajo.
