# Viagelato · Corrección de política de envíos y auditoría de pedidos (05/11/2026)

## Regla comercial vigente

- **ARS 60.000** es el monto mínimo **de productos** para obtener envío gratis dentro de las siete localidades habilitadas: Lanús, Banfield, Avellaneda, Lomas de Zamora, Valentín Alsina, Don Bosco y Wilde.
- A partir de **ARS 60.000 inclusive** de subtotal en esas zonas, envío = ARS 0 y total = subtotal.
- Dentro de zona por debajo del mínimo: se aplica una tarifa solamente si está configurada, activa y lista. De lo contrario, el envío y el total final siguen pendientes de cotización por WhatsApp.
- Fuera de zona, incluida CABA: **no se agrega ARS 60.000 como costo automático**. Confirmar cobertura, importe y fecha por WhatsApp. Solo una zona activada por administración con tarifa explícita podrá presupuestarse automáticamente.
- Retiro en local: costo ARS 0 sin compra mínima, cuando esté habilitado.

## Recorrido auditado

1. El cliente agrega productos y revisa subtotal, cantidades y presentaciones.
2. Elige envío o retiro, localidad, forma de pago preferida y completa nombre/observaciones.
3. `POST /api/whatsapp-request` valida origen, cuerpo, límite de solicitudes, idempotencia y Turnstile cuando corresponde.
4. La API vuelve a consultar catálogo/precios en Supabase y rechaza artículos obsoletos o un subtotal que ya no coincide con el carrito.
5. La solicitud se registra como borrador con referencia `VIA-...` y fotografía de líneas/precios, sin cobrar ni descontar stock.
6. Cliente y API cotizan con `quoteShipping`; antes de abrir WhatsApp, el frontend verifica subtotal, condición del envío, costo y total.
7. Se abre WhatsApp con el mensaje preparado. No significa que el cliente lo haya enviado ni pagado.
8. Administración confirma stock, tarifa acordada, estado y pago. Solo se habilitan operaciones de cobro con importes íntegros y confirmados.
9. Las solicitudes ya confirmadas conservan sus importes históricos; esta corrección no modifica pedidos anteriores.

## Verificación real antes del cambio

Consulta en modo lectura de Supabase `Viagelato-ECommerce`: `site_settings.free_shipping_threshold=60000`; siete localidades con `cost=null`, sin tarifas listas. Había una solicitud registrada y ninguna con `shipping_cost=60000`. No se realizaron pedidos de prueba ni cambios de datos.

## Pruebas de regresión

- Zona habilitada: subtotal ARS 59.999,99 → costo pendiente cuando no exista tarifa.
- Zona habilitada: subtotal ARS 60.000 exactos o superior → envío sin costo.
- Rosario, CABA y Quilmes Oeste, sin tarifa explícita → costo pendiente y total final a confirmar.
- Zona con tarifa activa y lista por debajo del mínimo → subtotal + tarifa vigente.
- Retiro en local → ARS 0 sin mínimo.
- API, carrito, WhatsApp y panel deben mantener la misma regla; reintentos no duplican pedidos.

## Estado del cambio

Propuesto en rama/PR con actualización de pruebas y documentación. Sin nuevas migraciones de base de datos, sin cambios de pedidos existentes, y sin desplegar a producción de manera anticipada.
