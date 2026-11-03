# Viagelato — Arquitectura del carrito y seguridad de endpoints

**Corte:** 03/11/2026. **Objetivo:** crecer sin trasladar reglas comerciales ni credenciales privilegiadas al navegador.

## Responsabilidades y fuentes de verdad

| Capa | Responsabilidad | No debe hacer |
| --- | --- | --- |
| `CartProvider` | Guardar `id + quantity` en localStorage, sanitizar entradas y sincronizar entre pestañas | Persistir precios como autoridad ni crear pedidos |
| `cart-view-model.ts` | Resolver productos públicos, cantidades, subtotales en centavos, stock visible y faltantes | Decidir el precio final o cobrar |
| `Checkout` | Elegir localidad, envío/retiro, preferencia de pago y mostrar importes orientativos | Marcar órdenes pagadas o inventar tarifas |
| `shipping-quote.ts` | Estimar envío con las zonas de la base recibidas desde el servidor | Sustituir una cotización real confirmada |
| `POST /api/whatsapp-request` | Validar origen, tamaño, formato, clave de idempotencia, cuota, productos y precios contra Supabase; registrar referencia y mensaje | Confiar en importes recibidos del cliente |
| `adminOrError` + `assertAdmin` | Comprobar origen de mutación, sesión Auth y membresía de `admin_users` | Dar acceso solo por ocultar un link en el footer |
| `privilegedDb()` | Operar solamente del lado servidor, con controles por endpoint | Inyectarse en componentes `use client` o mostrarse en logs |

La secuencia es: **catalogo real de Supabase → selección local → estimación de envío → revalidación de API → solicitud con referencia → WhatsApp → confirmación humana**. No se realiza una transferencia bancaria automáticamente, ni abrir WhatsApp prueba que se haya enviado el mensaje.

## Controles implementados

- **Origen y CSRF:** las mutaciones requieren un `Origin` explícito permitido. No confiar en `request.url` o en `Host` reflejado. Las previews requieren orígenes permitidos de manera explícita para escribir.
- **Límites de entrada:** `readJsonBody()` controla el `Content-Type` y acota bytes incluso con transferencia por fragmentos. Zod valida la forma y cantidad de los datos, IDs y preferencia de pago.
- **Rate limiting:** `rateLimitClientKey()` genera un HMAC del cliente identificado por el proxy controlado de Vercel (`x-vercel-forwarded-for`), no por un `x-forwarded-for` arbitrario. La cuota se aplica mediante `consume_checkout_attempt` en PostgreSQL. Si no hay plataforma confiable, se usa la categoría `unknown` (denegación conservadora, no una IP aportada por el cliente). Si se reactiva el checkout legado en Render, **se debe identificar un header de proxy confiable en ese entorno** antes de exponerlo a producción.
- **Idempotencia:** `Idempotency-Key` más huella de los datos impide duplicados en reintentos. El cliente no crea automáticamente una nueva clave al encontrar una solicitud gestionada.
- **RLS:** tablas internas de clientes, pedidos, cobros y administradores no tienen permisos públicos. El frontend solamente usa claves públicas; `service_role` se mantiene en servidor.
- **Caché:** las respuestas administrativas, solicitudes WhatsApp, checkout y cron anuncian `Cache-Control: no-store`. Los datos de clientes no se guardan en CDN.
- **Checkout comercial:** se mantienen `ENABLE_CHECKOUT=false` y `ENABLE_INDEXING=false` hasta aprobar el lanzamiento correspondiente. El canal vigente para finalizar la selección es WhatsApp.

## Evolución escalable

1. **Una función de un solo propósito por capa:** cálculos de visualización en módulos puros, adaptadores Supabase en servidor, componentes UI sin secretos. Ante una nueva pasarela o un segundo canal de venta, introducir un servicio de pedidos independiente; no agregar condiciones al componente del carrito.
2. **Catálogo:** la planilla estática se usa como respaldo únicamente sin Supabase. La tienda conectada debe obtener precios del catálogo validado; el endpoint vuelve a consultarlos antes de registrar la solicitud. Evitar duplicar precios en los componentes.
3. **Datos:** usar migraciones versionadas y RLS por defecto, agregar índices solo tras revisar consultas reales. No tocar datos comerciales mediante pruebas automatizadas: `npm run test:db` utiliza una base desechable.
4. **Rendimiento:** monitorizar tiempos de consultas de catálogo, `getStore`, solicitudes WhatsApp y tamaño de JS/CSS. El panel admin y los estilos acumulados son candidatos para división progresiva, **sin reescritura total**.
5. **Observabilidad:** capturar códigos de error y latencia sin registrar nombres, direcciones, números, URLs de WhatsApp con mensaje ni claves de Auth.
6. **Límites comerciales:** 30 referencias distintas por solicitud, cantidades validadas, precio siempre recalculado en servidor, cobertura/entrega a confirmar si no hay zona tarifada.

## Verificación requerida antes de publicar

- `npm test`: cálculos, carrito entre pestañas, pagos, tarifas, idempotencia, endpoints, RLS por simulación.
- `npm run lint`, `npm run typecheck`, `npm run test:db`, `npm audit --omit=dev --audit-level=moderate`, `npm run build`.
- Preview Vercel `READY` para el mismo SHA que pasó CI.
- Comprobación final del alias de producción y ausencia de errores de runtime. La verificación manual autenticada sigue siendo un control adicional, no sustituye CI.
- Probar móvil: agregar/quitar presentaciones, vaciar con confirmación, envío fuera de cobertura, transferencia/efectivo, reintentar sin duplicar y actualizar en otra pestaña.

Referencias internas: [RLS y migraciones](RUNBOOK_MIGRACIONES_RLS.md), [auditoría Supabase](ESTADO_SUPABASE_RLS_20261102.md).
