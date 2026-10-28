# Revisión técnica del starter de Viagelato (ZIP proporcionado en el chat)

**Alcance:** revisión estática del archivo `viagelato-starter-sin-pasarela.zip`, NO del trabajo actual de Codex, que puede haber cambiado. No se ejecutaron pruebas reales sobre Supabase.

## BLOQUEANTES antes de habilitar `ENABLE_CHECKOUT=true`

### 1) Reservas de stock sin vencimiento, sin idempotencia y sin mitigación de abuso [CRÍTICO]
- `src/app/api/checkout/route.ts` llama directamente a `reserve_order` con `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase/schema.sql`, `reserve_order`: descuenta stock desde el primer pedido, aunque el pago sea manual y esté pendiente.
- Un cliente (o bot) puede generar muchos pedidos, agotando existencias. El archivo ya advierte que falta rate limiting, pero **no basta con un texto de advertencia**.
- **Requerido:** protección anti-abuso del lado servidor, clave idempotente por intento, control de duplicados, reserva temporal con expiración y política de cancelación/confirmación; mantener pago y entrega como estados separados.
- Asegurar que, al cancelar/vencer, la devolución de stock sea atómica y exactamente una vez.

### 2) El sistema permite retiro sin autorización comercial [ALTO]
- `src/components/checkout.tsx`: opción de retiro visible por defecto.
- `reserve_order`: acepta `p_shipping_method = 'pickup'` sin consultar configuración de negocio.
- **Requerido:** ocultar y bloquear retiro en UI y servidor hasta confirmación explícita del comercio. No confiar en lo que mande el cliente.

### 3) Tarifa de envío gratuita accidental [CRÍTICO]
- `shipping_zones.cost numeric ... DEFAULT 0`, zonas de ejemplo inactivas con `cost=0`.
- `src/components/admin-dashboard.tsx`: al guardar una zona usa `active:true` y `zoneCost` inicial es 0.
- `reserve_order` da envío 0 sobre el umbral, y bajo el umbral utiliza `shipping_zones.cost`; un admin puede habilitar tarifa 0 por accidente, aunque todavía no se definió costo bajo el mínimo.
- **Requerido:** separar tarifa pendiente (`NULL`) de tarifa realmente gratuita (`0`) y validar que la zona está lista antes de activarla. No habilitar envío automático para CABA.

### 4) Envío gratis no distingue elegibilidad por zona [ALTO]
- `reserve_order` aplica el umbral de ARS 60.000 a **toda** zona activa.
- **Requerido:** `free_shipping_eligible` por zona y validación en backend. CABA debe permanecer consulta manual hasta tener condiciones.

### 5) Faltan precios, stock y contratos comerciales confirmados [BLOQUEANTE DE NEGOCIO]
- El material del Drive tiene fotos; no representa productos listos para vender.
- Mantener `ENABLE_CHECKOUT=false` hasta completar el catálogo comercial y confirmar las reglas reales.

## Mejoras importantes (después de los bloqueantes)

### 6) Gestión del catálogo y contenido desde admin
- El modelo `products` sólo tiene una imagen principal. Para galería/variantes reales agregar tablas de imágenes, presentaciones y SKU, pero sólo si el negocio las necesita en el MVP.
- Evitar `active=true` como valor por defecto al crear productos sin precio y stock confirmados.

### 7) Imágenes
- `src/app/api/admin/upload/route.ts` valida MIME declarado y tamaño máximo de 3 MB; conviene verificar firmas/tipos reales y dimensiones y normalizar nombres.
- Los assets de este kit están optimizados y se pueden servir desde `/public/catalogo` en el MVP.

### 8) Estados de pedidos
- `admin_update_order` bloquea cancelar pedidos pagados y entregados; es razonable como guardia, pero habrá que definir devoluciones, reembolsos externos y anulaciones.
- Agregar `audit_logs` para quien cambió el estado de pago y cuándo.

### 9) Pruebas y operaciones
- No hay pruebas automatizadas en el ZIP entregado; correr `npm install`, `npm run typecheck`, `npm run lint` y `npm run build` en entorno real. Esta revisión estática no demuestra que compiló.
- Probar especialmente pedidos simultáneos, reintentos, cancelaciones, zona sin tarifa, monto justo 60.000, acceso no autorizado y carga de archivos.

## Secuencia sugerida para Codex

1. Estabilizar compilación y sesión admin.
2. Revisar esquema y migraciones en un proyecto Supabase nuevo (no reutilizar ERP/FZAC).
3. Corregir 1–4 con pruebas y restricciones de DB.
4. Integrar `public/catalogo` y validar fotos/precios/stock sin publicar nada.
5. Completar admin y verificar usuarios no autorizados.
6. Probar checkout manual extremo a extremo antes de producción.

**Nota:** no incluye pushes, modificaciones en el repositorio local, migraciones aplicadas ni despliegues.
