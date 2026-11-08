# Viagelato · Control de catálogo y corte previo al dominio

> **Actualización comercial del 05/11/2026:** los $60.000 son el mínimo para envío gratis en localidades elegibles, NO un costo fijo fuera de cobertura. Esa tarifa histórica deja de aplicar: destinos externos se cotizan por WhatsApp. Documento vigente: [Corrección de envíos y pedidos](./CORRECCION_ENVIOS_PEDIDOS_2026-11-05.md).
**Fecha de revisión:** 2026-11-05

## Fuentes de verdad

1. Excel original del comercio: `PRODUCTOS Y PRECIOS(1).xlsx`, pestaña `Hoja1`, filas `2:46` (45 artículos), columnas A: descripción, B: precio final ARS y C: imagen de Drive.
2. Carpeta de imágenes `Seitu`: https://drive.google.com/drive/folders/1xycIRdWZ9vEwbv3I0KGsjG2dgRRJiS2b (50 imágenes).
3. Repositorio `docs/viagelato/catalogo_precios_20261028.json` (espejo versionado de la planilla).
4. Datos comerciales publicados en Supabase `public.products` (`catalog_visible=true`), sin modificar tablas ni migraciones.
5. Web en producción `https://viagelato.vercel.app`, Vercel / GitHub `main`.

## Resultado de conciliación

- **45/45 precios** de GitHub son idénticos a la columna B del Excel, por número de fila.
- **45/45 tamaños de venta** coinciden: cajas x6, x8, x12, x14, x16, x20, x24, x36, potes 360/750 cc, envases 150 g, tortas 800 g, baldes 3/5 L y lata 10 L. El Excel no especifica peso de Mini Torta Cookies; NO inventar gramaje.
- **45/45 productos** tenían campos de nombre, precio, imagen, SKU, presentación y descripción sincronizados entre JSON del repositorio y Supabase antes de este corte.
- **44/44 vínculos de foto del Excel** corresponden a `sourceDriveId` únicos del catálogo y existen en la carpeta de Drive.
- Los **45 recursos** que la tienda muestra están versionados bajo `public/catalogo`. La lata de 10 L (fila 46) **no tiene vínculo en la columna C**; utiliza una foto referencial aportada por el cliente fuera del Excel. No afirmar que se verificó esa foto contra Drive.
- El recurso `postres-seitu-diplay.webp` de la fila 35 muestra efectivamente una **Torta Isabella** con etiqueta rosa. El recurso `IMG-20261023-WA0103.jpg` de la fila 45 muestra un **balde de 5 L**; no se basó la verificación únicamente en el nombre del archivo.

## Ajustes de contenido de este corte

Las filas de Excel que enumeran varios sabores no garantizan que una caja contenga **todos los sabores mezclados**. Se modificaron nombres o descripciones de las filas 2, 8, 10, 17 y 19, sin alterar sabores, precio, SKU ni presentación.
Para Mini Torta Cookies (fila 32), no afirmar que sea una porción individual ni inventar peso.

En la ficha comercial, mostrar opciones de variedad tal como informa el Excel e indicar que la combinación efectiva de sabores queda sujeta a confirmación. El carrito facilita escribir sabores deseados en el campo de observaciones; no altera los identificadores ni la reserva de stock.

## Contenido antiguo en previews

Las PR anteriores no deben fusionarse sin reconciliación con `main`:

| PR | Contenido | Decisión de este corte |
|---|---|---|
| #23 | Metadatos de producto y Open Graph | Se incorpora una versión actualizada a la rama de lanzamiento; `ENABLE_INDEXING` continúa apagado |
| #24 | Hardening de API, SEO y SQL | Las protecciones principales ya tuvieron implementaciones posteriores; no volver a aplicar migraciones antiguas |
| #25 | Checkout y textos de retiro/entrega | Superado por checkout actual, envío de $60.000 fuera de zona, retiro gratis y WhatsApp |
| #27 | Corrección antigua del Origin de checkout | Superado por validaciones actuales; no reemplazar la ruta de pedidos |
| #29 | Cola priorizada de WhatsApp | Verificada parcialmente en interfaz actual; no mezclar la rama vieja |
| #30 | Cobros en efectivo / resumen diario | **Pendiente por separado**; incluye parche SQL y cambios contables, requiere revisión de migración y pruebas de rol |
| #32 | Login de administradores en previews antiguas | Requiere QA específica con entorno de prueba; login nuevo está activable por flag, no mezclarlo a ciegas |
| #50 | Paginación por cursor y respaldos cifrados | **Pendiente por separado**; funcionalidad administrativa y operación de backups, no es un cambio estético público |

## Condiciones comerciales ya confirmadas

- Envío gratuito desde **ARS 60.000** dentro de las siete zonas habilitadas.
- Por debajo de ese importe, dentro de zona: **tarifa a coordinar por WhatsApp**; nunca inventar precio.
- Fuera de zona: **ARS 60.000** de envío calculado, sujeto a confirmación de cobertura.
- Retiro en **Eva Perón 3050, Lanús Este**, gratuito y sin mínimo.
- No se cobra en línea; elección entre transferencia y efectivo se coordina por WhatsApp.

## Puertas para cambio de dominio / Cloudflare

- CI unitario, lint, TypeScript, PostgreSQL y build en verde; Vercel Preview READY.
- Fusionar en `main` solo el código reconciliado, comprobar Vercel Production READY y ficha real de productos.
- Sin modificar DNS, variables sensibles ni indexación todavía.
- Al adquirir dominio, configurarlo en **Vercel** y **Cloudflare** siguiendo valores DNS/certificados reales.
- Turnstile se activa con claves de producción reales y prueba del admin; no se considera activo mientras no estén.
- No reactivar checkout online ni rutas Render antiguas.

## Observaciones de lanzamiento

La lista de precios es la referencia recibida en noviembre de 2026; los precios nuevos que establezca el negocio necesitan una actualización autorizada. En pedidos con varias opciones se debe confirmar la variedad seleccionada, ya que el Excel define un SKU por presentación, **no un SKU diferente por sabor**.
