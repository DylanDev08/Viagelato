# Viagelato — Kit de imágenes y contrato comercial

**Estado:** material preparado, no integrado a repositorio local de Codex. Fecha de revisión: 28/10/2026.

## Contenido

- `public/catalogo/`: **48 archivos WebP únicos**, optimizados sin recortes ni cambios de contenido.
- `docs/viagelato/manifest_imagenes.json`: inventario con origen Drive, ruta local, dimensiones, SHA-256 y categoría provisional.
- `docs/viagelato/catalogo_borrador.csv`: filas de revisión, **NO importar aún a `products`**.
- `docs/viagelato/duplicados_verificados.json`: duplicados comprobados por hash exacto.
- `docs/viagelato/vista_catalago_1.jpg` y `_2.jpg`: contacto para verificar nombres y presentaciones con el cliente.
- `docs/viagelato/reglas_confirmadas.json`: negocio, medios de pago y zonas.
- `docs/viagelato/escenarios_qa.csv`: casos de prueba.
- `docs/viagelato/AUDITORIA_STARTER.md`: hallazgos prioritarios y tareas concretas para Codex.

## Cómo integrar sin conflictos

1. Descomprimir en la raíz del repositorio `viagelato-starter` (donde esté `package.json`).
2. Estos archivos sólo agregan `public/catalogo` y `docs/viagelato`: no sobreescriben `src/` ni `supabase/schema.sql`.
3. Abrir las dos vistas de catálogo, revisar clasificación y acordar primeros 30 productos con el cliente.
4. No crear productos activos con precio 0 ni stock inventado. Registrar los datos cuando sean confirmados.
5. Referenciar cada foto con `/catalogo/<nombre>.webp`. La imagen debe visualizarse aunque todavía no exista Supabase Storage.
6. Codex podrá importar a Storage cuando el admin y la DB estén listos. El producto NO se activa hasta completar nombre, SKU/presentación si corresponde, precio y stock.
7. No asumir que todos los archivos son productos: `seitu-logo-1.webp` es logo de otra marca; `postres-seitu-diplay.webp` es material de marca.

## Resultado técnico

- Archivos originales aportados: 50
- Duplicados exactos excluidos: 2
- Imágenes únicas preparadas: 48
- Tamaño único sin optimizar: 18.85 MiB
- Tamaño optimizado total: 4.14 MiB
- **No se alteraron las fotos originales**, únicamente se generaron copias WebP.

## Advertencias

No publicar precios, stock, zonas ni políticas ficticias. La transferencia requiere verificación manual; el cobro al recibir no implica pago anticipado. Confirmar retiro antes de habilitarlo, así como costo bajo los ARS 60.000.
