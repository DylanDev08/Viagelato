# Auditoría de creación y gestión de pedidos — Viagelato
**Corte:** 2026-11-05  
**Producción revisada:** `9f647ec` (`viagelato.vercel.app`)  
**Alcance:** análisis de solo lectura de Supabase, Vercel y código GitHub; pruebas de regresión sin pedidos reales.

## Ruta comercial vigente
1. El comprador agrega cajas/presentaciones y selecciona método de entrega y pago preferido.
2. El frontend muestra subtotal, envío y total, o aclara que la tarifa está **a confirmar**.
3. Se envía `POST /api/whatsapp-request` con clave de idempotencia (UUID), datos de entrega y artículos. La clave permanece en sessionStorage para evitar duplicaciones por reintentos.
4. El backend valida origen, tamaño/JSON, esquema, límite atómico de intentos, Turnstile si tiene claves configuradas, la configuración del comercio, el catálogo vigente, los precios, unidades y stock cuando está disponible. El importe final **nunca se toma del cliente**.
5. Se guarda un registro `draft` y se devuelve enlace de WhatsApp con referencia `VIA-...` y subtotal/cotización.
6. El comprador **debe enviar el mensaje por WhatsApp**. Abrir el enlace y crear el borrador no garantizan que se haya enviado o que el comercio lo haya recibido.
7. El administrador marca contacto, verifica stock y costo de entrega, confirma el pedido, registra transferencia o efectivo **recibido realmente**, lo prepara y marca entrega. Las RPC de Supabase comprueban transiciones y pago.

## Hallazgo corregido en esta PR — presupuesto desactualizado
Anteriormente el navegador descubría una diferencia de tarifa **después** de que la API insertara un borrador. Si la tarifa cambiaba, el usuario no veía el enlace, pero el pedido ya quedaba registrado en administración.

Ahora el cliente envía opcionalmente el **tipo de envío, costo y total visibles** junto al subtotal. Una comparación estricta, tras recalcular precios en servidor, rechaza la discrepancia con `409 SHIPPING_QUOTE_CHANGED` **antes del INSERT**. Cero confianza en los importes del navegador; estos campos sólo previenen conflictos por cambios simultáneos. Clientes anteriores sin campos nuevos siguen siendo compatibles. Pruebas para zona con tarifa recién publicada, fuera de zona manipulada, tarifa vigente, envío gratis y campos parciales.

## Estado verificado (sin escribir en producción)
- La fuente de precio es `public.products`: los artículos del Excel se leen si `catalog_visible=true`, los UUID comerciales requieren `active=true`, `commercially_verified=true` y stock suficiente.
- `whatsapp_order_requests`, `whatsapp_request_payments` y `whatsapp_request_events` tienen RLS habilitada y ninguna política pública.
- La clave de idempotencia de solicitud es única por índice, al igual que las claves de cada pago.
- `total` es columna generada, igual a `subtotal + shipping_cost`. La confirmación de condiciones exige stock confirmado, y tarifa 0 en retiro o envío gratuito elegible.
- Los métodos preferidos del pedido WhatsApp son transferencia o efectivo al recibir/retirar. No se realiza un cobro automático, ni se debe inventar un pago.
- El endpoint heredado `POST /api/checkout` pasa a devolver **HTTP 410** sin conexión a base de datos ni posibilidad de llamar a `reserve_order` (independiente de `ENABLE_CHECKOUT`).
- La seguridad opcional Turnstile no se considera activa hasta configurar claves reales.
- La base tenía **una solicitud contactada** con envío y total aún pendientes, sin pago registrado. No se modificó; el administrador debe verificar el costo antes de confirmarla.
- En las siete zonas predefinidas, envío gratis desde ARS 60.000; compras menores requieren coordinación. Fuera de zonas se cotiza cobertura y costo manualmente por WhatsApp; los ARS 60.000 NO son una tarifa fija. Retiro local gratis.

> **Regla comercial de envíos actualizada:** [Corregir envíos y pedidos](./CORRECCION_ENVIOS_PEDIDOS_2026-11-05.md). Los ARS 60.000 son el umbral de productos para envío gratis dentro de las siete localidades habilitadas, no el importe de envío fuera de zona.

## Segunda corrección de arquitectura — no abrir checkout de Render desde Vercel

El `next.config.ts` anterior tenía una redirección `beforeFiles` de
`/api/checkout` al origen `API_ORIGIN` en Render. Como Render ejecuta
otra rama y tiene variables propias, el `ENABLE_CHECKOUT=false` de Vercel
**no garantizaba** que la ruta delegada también estuviera desactivada.

- Esta PR elimina sólo la redirección de `/api/checkout`.
- Vercel responde con su propio handler de retiro definitivo (HTTP 410) sin invocar `reserve_order`, aunque alguien habilite `ENABLE_CHECKOUT`.
- `/api/whatsapp-request` continúa local en Vercel (el flujo de negocio vigente).
- `/api/cron/:path*` conserva su redirección existente para no cortar tareas antiguas sin revisar.
- El servicio independiente `viagelato-api.onrender.com` recibió `ENABLE_CHECKOUT=false` el 05/11/2026 y se redeplegó. Para impedir que la ruta se reactive si cambia la variable, se preparó además una PR específica de Render (#66) que responde HTTP 410 incondicionalmente. No considerar el cierre definitivo verificado hasta probar el despliegue de esa PR.
- Render no devolvió registros de solicitudes a `/api/checkout` en la ventana
  consultada (29 de octubre–5 de noviembre), **lo que no demuestra** que la
  ruta esté inaccesible o que no haya existido tráfico fuera de esa ventana.

Se agregaron pruebas para comprobar que `next.config.ts` no vuelva a
delegar checkout a Render y que el endpoint local **siempre** responda 410,
independientemente del flag, sin utilizar la base de datos.

## Riesgos pendientes y criterios de aceptación
1. **Prueba E2E asistida:** comprador prepara pedido de prueba y envía WhatsApp; el admin comprueba que el mensaje se recibió, verifica referencia y marca contacto. Requiere cuentas propias y autorización para crear una solicitud de prueba; aquí no se hizo.
2. **Idempotencia y cotización histórica:** la API reconstruye el presupuesto de una solicitud existente a partir de las **tarifas vigentes**, no de un snapshot persistido al crearla. El precio de los artículos sí queda fijado. Ante cambios posteriores de zonas se puede informar una tarifa distinta en el reintento. Para congelar el presupuesto inicial en todos los casos se requiere un campo de cotización inmutable y migración coordinada; no mezclar en esta corrección sin pruebas de migración.
3. **Pedidos abandonados:** un registro `draft` significa mensaje preparado, **no enviado**. Mantener esta advertencia visible al administrador; no cancelar automáticamente sin reglas comerciales.
4. **Stock de catálogo del Excel:** no se reserva al crear un borrador; la disponibilidad se confirma manualmente. No anunciar "comprado" o "reservado" antes de aceptación.
5. **Variantes por producto:** se solicitan en observaciones, no tienen SKU individual; WhatsApp confirma exactamente cuál caja se entrega.
6. **Activación final:** revisar PR y CI, previsualización de Vercel; publicar únicamente tras validación, sin modificar datos de clientes existentes ni ejecutar pagos.
