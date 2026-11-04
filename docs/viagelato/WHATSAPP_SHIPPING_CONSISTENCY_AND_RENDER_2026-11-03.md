# Corte de consistencia: carrito, WhatsApp, panel y Render — 2026-11-03

## Regla de importes

- **Subtotal:** suma de `precio × cantidad` validada contra Supabase por API.
- **Envío gratuito:** desde ARS 60.000 en las siete localidades elegibles.
- **Fuera de zona:** ARS 60.000 adicionales; cobertura y fecha se confirman personalmente.
- **Dentro de zona por debajo del mínimo:** se aplica tarifa configurada si la zona está activa y lista. Si falta, **no inventar una tarifa**: el total sigue pendiente de cotización y el subtotal es visible.
- **Retiro:** ARS 0 de envío, cuando está habilitado en configuración.
- **Total del pedido:** subtotal + costo de envío, solo cuando este último es conocido; la API de pedidos sigue siendo la fuente final del cálculo.
- El monto mostrado antes de que administración confirme stock y costo se etiqueta **estimado**, nunca pago recibido ni pedido aprobado.

## Prevención de inconsistencias

- Cliente y API utilizan `quoteShipping` con las mismas reglas y localidades normalizadas.
- Tras crear una solicitud, el cliente verifica `shipping_kind`, `shipping_cost` y `total` de la API, además del subtotal, antes de abrir WhatsApp. Si difieren, obliga a revisar el carrito. No crea un segundo pedido automáticamente.
- En administración los pagos se calculan **únicamente con el total confirmado guardado**; cotizaciones orientativas solo se muestran, no habilitan cobro.
- Si la base devuelve costo y total incompletos, diferencia entre subtotal + envío, o pagos por encima del total, la ficha indica “A revisar” y bloquea pagos y cambios de estado. El cliente no puede modificar el registro directamente.
- Conservamos saldos internos para control de pagos parciales, pero **no mostramos la tarjeta «Saldo pendiente»**.
- No se añaden tablas, triggers, índices, cachés de precios ni consultas adicionales a Supabase.

## Ejemplos verificables

| Destino | Productos | Envío | Total orientativo |
|---|---:|---:|---:|
| Rosario | $68.700 | $60.000 | **$128.700** |
| Lanús (zona elegible) | $68.700 | $0 | **$68.700** |
| Lanús (sin tarifa confirmada) | $21.900 | Pendiente | A confirmar |
| Quilmes Oeste (fuera de cobertura) | $21.900 | $60.000 | **$81.900** |

## Infraestructura observada

El servicio Render `viagelato-api` (`srv-dbgo1se7bikc73b5h21g`) ejecuta
la **misma aplicación Next.js de Viagelato**, no un backend Nest/Express separado.
Configuración observada: rama `chore/viagelato-render-vercel-20261028`,
despliegue automático deshabilitado, plan Free, una instancia en Virginia,
sin health check configurado. Último despliegue *live* de esa instalación:
2026-11-01 03:27 UTC, commit `78d2622888b74aa9a2754a67480bf262effa085d`.
Vercel sirve una rama/versionado distinto. La duplicación requiere revisión de
dominios, tráfico real, referencias de API, webhooks y tareas CRON.

### Condiciones para retirar Render con seguridad

1. Identificar URLs consumidas por Vercel, frontend, clientes y servicios externos.
2. Validar que ninguna integración actual dependa de
   `https://viagelato-api.onrender.com` (clientes, proveedores, Auth redirects,
   WhatsApp, cualquier futura API o cron).
3. Confirmar que todos los pedidos actuales se gestionan por
   `/api/whatsapp-request` en la app principal, sin reservas antiguas ni pagos
   por el checkout desactivado.
4. Confirmar que no hay tareas automáticas, webhooks, DNS, monitores, jobs ni
   puntos de recuperación apuntando a Render.
5. Planificar retiro con ventana de verificación y un plan de reversión;
   no apagar ni eliminar el servicio como parte de este corte.

## Orden de integración

- Esta PR depende de #53 (tarifa fuera de zona y total).
- #55 y #56 son otro conjunto de endurecimiento de seguridad/catálogo,
  **no deben fusionarse a ciegas** sobre esta rama. Resolver conflictos y
  ejecutar todos los tests en una rama de integración antes de merge.
- No tocar pedidos, pagos, políticas RLS ni variables de producción por este corte.
- No activar indexación pública automáticamente.
