# Viagelato — auditoría de seguridad, negocio e infraestructura (2026-11-03)

Documento operativo de revisión. No contiene valores de variables, tokens, datos de clientes ni capturas privadas.

## Arquitectura actual

- **Vista:** componentes React, páginas Next.js App Router `src/app/**`, estilos.
- **Controladores HTTP:** rutas `src/app/api/**/route.ts`; origen validado y esquemas Zod para escrituras.
- **Dominio / servicios:** `src/lib/**` para cotización de entregas, carrito, solicitudes, permisos y validación.
- **Persistencia:** PostgREST/Supabase; clientes público y privilegiado separados en `src/lib/supabase.ts`.
- **Infraestructura:** Vercel ejecuta la tienda y la API actual de WhatsApp; Render mantiene una API/checkout legado y cron.
- **Almacenamiento:** Supabase Storage almacena imágenes públicas con límite de 3 MB por objeto y tipo MIME restringido.

No conviene añadir un MVC clásico ni microservicios sin necesidad. La separación conceptual ya existe y puede evolucionar a módulos de dominio sin una reescritura.

## Hallazgos verificados

| Prioridad | Hallazgo | Remediación / estado |
| --- | --- | --- |
| Alta | No existía un secreto HMAC independiente configurado en Vercel para limitar solicitudes públicas; la API de WhatsApp reutilizaba la clave de servicio de Supabase como alternativa | Se creó `CHECKOUT_RATE_LIMIT_SALT` como secreto de producción. Esta PR elimina el fallback y exige un secreto suficiente. La nueva versión necesita despliegue para leer la variable |
| Alta | El repositorio público contiene un ZIP de integración que no se inspeccionaba por CI | Nueva inspección de archivos versionados y ZIP con Python estándar; no imprime valores. Considerar igualmente las alertas nativas de GitHub |
| Media | Las siete zonas de reparto están en Supabase con `active=false`, `ready=false` y coste nulo | No activar ni inventar tarifas sin confirmación comercial; mantener regla de envío gratis desde $60.000 para zonas previstas |
| Media | Los 45 productos están `catalog_visible=true` pero sin publicación/verificación del catálogo tradicional | Mantener la ruta de lectura del catálogo y no ampliar RLS de `products` indiscriminadamente. Diseñar una vista pública de columnas mínimas en una migración posterior, con pruebas de datos privados |
| Media | Las páginas públicas hacen varias consultas a Supabase por render | Compartir lectura de categorías dentro del request (PR #55); medir latencia real antes de introducir caché persistente de precios |
| Media | El checkout y cron antiguos siguen disponibles en un backend Render aparte | Inventariar dependencias y cortar las rutas legadas cuando se valide que ya no son necesarias; no suspender el servicio sin comprobación |
| Media | SEO del catálogo comercial no estaba listo para indexación | PR #55 prepara canonical, JSON-LD y sitemap; `ENABLE_INDEXING` sigue deshabilitado |
| Baja | Supabase informa índices aún sin uso | Con el volumen actual no se deben borrar: preservar los destinados a operaciones y pagos que todavía no tienen carga |

### Datos de autorización confirmados

- RLS habilitado en las tablas públicas.
- `anon` y `authenticated` no tienen permiso para ejecutar las funciones sensibles de cobro, pedidos o rate limit.
- Los registros de pedidos, eventos y pagos no tienen permisos SQL de lectura pública.
- Las funciones transaccionales controlan estados de pedidos y pagos. No publicar secretos con prefijo `NEXT_PUBLIC_`.

### Carga de la base de datos (plan Free)

- La función de limitación registra intentos con clave hasheada y elimina los anteriores a 24 horas.
- No introducir procesos de limpieza duplicados.
- Paginar listados administrativos y seleccionar columnas concretas.
- Mantener `no-store` en endpoints de pedidos, sesiones y pagos; **no utilizar caché compartido** con información de clientes.
- Agregar métricas de latencia y errores sin guardar cuerpos de pedidos ni datos personales.
- Ajustar índices según planes `EXPLAIN (ANALYZE, BUFFERS)` en un entorno de prueba, no por advertencias de índices sin uso con tablas pequeñas.

## Plan de siguiente corte

1. Validar CI completo de la PR #55 y evitar merge automático.
2. Revisar la tarifa de entregas **dentro** de zona para compras inferiores a $60.000; mantener pendiente si no se conoce.
3. Preparar una lectura pública del catálogo con columnas mínimas y pruebas contra filtración RLS, en PR independiente y con migración de base de datos coordinada.
4. Inventariar rutas y secretos del Render legado; diseñar retiro controlado del checkout sin interrumpir WhatsApp.
5. Habilitar indexación pública solo al comprobar rutas, canonical, imágenes y flujo comercial de punta a punta.

## Límites del escáner de credenciales

La revisión de ZIP y fuente identifica patrones frecuentes, no equivale a auditoría exhaustiva de todo el historial Git ni a un detector de secretos de alta entropía. Si aparece un secreto real en cualquier commit, **rotarlo** y retirar el acceso antes de considerar completo el saneamiento de historial. No incluir valores reales en issues ni registros de CI.
