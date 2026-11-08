# Viagelato — catálogo y solicitudes por WhatsApp

Next.js 16, React 19, TypeScript y Supabase. Se conserva la identidad monocromática y no se integran pasarelas de pago.

## Desarrollo local

1. Usar Node.js 22 o 24.
2. Ejecutar `npm ci` para instalar las versiones del lockfile.
3. Copiar `.env.example` a `.env.local` y completar exclusivamente credenciales del proyecto Viagelato.
4. Ejecutar `npm run dev`.

Sin Supabase conectado se muestra el catálogo histórico de respaldo; no representa stock vigente ni permite registrar solicitudes reales. No utilizar ese modo para certificar operación comercial.

## Flujo vigente

El comprador agrega productos y cantidades al carrito, completa nombre/localidad y prepara una solicitud por `POST /api/whatsapp-request`. El servidor consulta precios y visibilidad vigentes, verifica stock de productos publicados y guarda una fotografía comercial con idempotencia. Las presentaciones importadas para consulta no tienen stock confirmado: su disponibilidad se coordina manualmente.

Se abre WhatsApp con el mensaje para revisar y enviar. Abrir el enlace no confirma envío, venta, pago ni reserva de mercadería. El carrito permanece guardado. El administrador registra contacto, verifica stock, acuerda envío y confirma el pedido; las transferencias se registran manualmente con importe e idempotencia.

`/api/checkout` y el cron de reservas son un circuito legado separado y permanecen protegidos por `ENABLE_CHECKOUT=false`. Esa variable no desactiva la recepción de solicitudes por WhatsApp cuando Supabase está conectado. No habilitar el circuito legado sin una decisión comercial y QA específico.

## Base de datos y migraciones

**Proyecto de producción:** `Viagelato-ECommerce` (`mxopaakzlmjbnrwolpgh`), independiente de otros negocios.

**Estado auditado el 02/11/2026:** 10 migraciones registradas en Supabase, 14/14 tablas `public` con RLS, lectura pública limitada por 5 políticas y 9 tablas internas privadas sin políticas de cliente. Los 10 RPC de `public` deniegan ejecución pública. Última migración: `20261102115243_viagelato_rls_default_grants_lockdown`, **ya aplicada en la base real** y versionada en Git (PR #42). No volver a aplicarla por rutina.

Para **PostgreSQL de pruebas descartable**, `npm run test:db` aplica `supabase/schema.sql`, luego `supabase/patches/*.sql` y luego los archivos de `supabase/migrations/` ordenados por nombre. Nunca ejecutar este procedimiento completo sobre producción. El historial remoto contiene versiones que no están en archivos individuales de `supabase/migrations/`: cotejar siempre el historial y el estado de esquema antes de cada cambio.

Los objetos administrativos y los pedidos usan `service_role` exclusivamente del lado del servidor, tras comprobación de sesión, rol y datos de entrada. No exponer esa clave en componentes cliente. El acceso público a los datos comerciales requiere permisos SQL **y** políticas RLS; las tablas privadas sin políticas quedan cerradas intencionalmente.

Documentos vigentes: [estado de Supabase y RLS](docs/viagelato/ESTADO_SUPABASE_RLS_20261102.md), [procedimiento de migración y despliegue](docs/viagelato/RUNBOOK_MIGRACIONES_RLS.md), [configuración de Supabase](docs/viagelato/CONFIGURACION_SUPABASE.md) y [alta del administrador](docs/viagelato/admin-setup.md). Los informes de octubre son históricos y no sustituyen estos procedimientos.

## Configuración

- `NEXT_PUBLIC_SITE_URL`: origen público HTTPS canónico, sin ruta. Localmente puede usarse `http://localhost:3000`; no habilita indexación.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: configuración pública del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`, `CHECKOUT_RATE_LIMIT_SALT`, `CRON_SECRET`: secretos de servidor; nunca usar prefijo `NEXT_PUBLIC_`.
- `ENABLE_INDEXING=false`: mantener hasta validar contenido, políticas y dominio. Sitemap vacío y robots bloqueado antes del lanzamiento.
- `API_ORIGIN`: sólo para el backend legado en Render. Admin, health y solicitudes por WhatsApp se resuelven en el servidor web. No configurarlo en Render para evitar bucles.
- `ADMIN_ALLOWED_ORIGINS`: orígenes adicionales explícitos para mutaciones administrativas, separados por comas; no se aplican al checkout público.

El formulario público requiere Origin propio o el origen canónico configurado. La identificación de IP debe provenir de cabeceras normalizadas por el proxy de confianza; validar ese comportamiento en cada despliegue.

## Verificación

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run test:db      # Docker requerido; usa PostgreSQL descartable
npm audit --omit=dev --audit-level=moderate
npm run build
```

En CI, la auditoría completa de dependencias de desarrollo se ejecuta adicionalmente como advertencia no bloqueante y está documentada en la [Issue #40](https://github.com/DylanDev08/Viagelato/issues/40). Las pruebas PostgreSQL no sustituyen Supabase Auth, Storage, navegador ni pedidos completos con datos de staging.

**Corte de referencia:** PR #39 (seguridad/admin), PR #41 (CSRF y cabeceras), PR #42 (migración y RLS), todas fusionadas. CI de `main` sobre `c8cef206aae96555edd7de9d2e56e36ac9de4e75`: [ejecución 41441120020](https://github.com/DylanDev08/Viagelato/actions/runs/41441120020), segundo intento aprobado. Vercel Production confirmó `READY` para ese commit y que `viagelato.vercel.app` apuntaba a él en la auditoría. Nuevos cambios deben volver a comprobar tanto CI como el alias del dominio.
