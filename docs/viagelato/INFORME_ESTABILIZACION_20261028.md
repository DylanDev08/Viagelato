# Informe de estabilización — 28/10/2026

## Alcance y Git

- Repositorio: `DylanDev08/Viagelato`.
- Base revisada: `main` en `0ac7491`.
- Rama de trabajo: `codex/viagelato-stabilization-20261028`.
- PR #1 revisado: `chore/viagelato-render-vercel-20261028` (`663adfa`).
- No se hizo push, merge ni deploy.
- `supabase/schema.sql` no fue modificado en esta etapa.

Del PR #1 se integraron de forma selectiva el logo suministrado, el modo no indexable por defecto, la detección segura de placeholders de Supabase y el refuerzo monocromático. No se integró el proxy de API a Render: altera el límite de infraestructura autorizado y requiere validar el transporte de cookies SSR antes de adoptarlo.

## Cambios realizados

- Branding blanco y negro, logo de Viagelato en el header y favicon monocromático.
- `ENABLE_INDEXING=false` por defecto; metadata y `robots.txt` bloquean indexación hasta el lanzamiento.
- Detección de Supabase configurado que rechaza valores de ejemplo o incompletos.
- Corrección de `/admin`: ya no intenta crear un cliente privilegiado mientras redirige a login sin configuración.
- Reglas de checkout extraídas y verificables: cantidades, zona/dirección, normalización estable e idempotencia del flujo existente.
- Reglas administrativas centralizadas para productos, publicación, zonas, banners y transferencia.
- Rutas administrativas con validación de JSON, mensajes seguros (sin filtrar errores internos) y rechazo de solicitudes cross-site.
- Panel con estados vacíos, bloqueo durante operaciones, feedback accesible y enlaces de vista cliente seguros.
- Suite Vitest/Testing Library para reglas, API deshabilitada, formularios/estados vacíos y catálogo provisional.
- Prueba de integración PostgreSQL preparada en `tests/integration/postgres`.
- Migraciones futuras documentadas por separado en `MIGRACIONES_PROPUESTAS.md`.

## Verificaciones ejecutadas

| Verificación | Resultado |
| --- | --- |
| `npm test` | 4 archivos, 11 pruebas aprobadas |
| `npm run typecheck` | Aprobado |
| `npm run lint` | Aprobado, sin errores |
| `npm run build` | Aprobado, 15 páginas generadas |
| PostgreSQL 17 descartable | `VIAGELATO_DB_TESTS_OK` |
| Catálogo | 48/48 imágenes cargadas, sin compra/precio/stock provisional |
| Mobile 360 px | 13 rutas, 11 enlaces, sin overflow; admin 401 |
| Tablet 768 px | 8 rutas, sin overflow; logo y `noindex` verificados |
| Desktop 1440 px | Navegación, filtros, carrito, checkout 503 y protección admin aprobados |

La prueba PostgreSQL fue real contra un contenedor temporal y terminó con rollback. Los tests Vitest de API/componentes usan mocks o JSDOM y no se presentan como validación de Supabase real.

## Pendientes externos

- Conectar el proyecto Supabase exclusivo de Viagelato y ejecutar pruebas reales de Auth, RLS, Storage y CRUD.
- Cargar y validar productos, precios, SKU, stock, zonas, tarifas y datos bancarios reales desde administración.
- Validar las políticas comerciales/jurídicas y el remitente de contacto.
- Mantener `ENABLE_CHECKOUT=false` y `ENABLE_INDEXING=false` hasta completar la prueba de aceptación con datos reales.

No se crearon productos ficticios ni secretos y no se modificaron proyectos Supabase, Render, Vercel o FZAC.
