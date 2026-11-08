# Viagelato — Operación segura con Supabase Free

**Corte 03/11/2026.** El objetivo es conservar el plan gratuito y evitar dependencias de herramientas de pago. Los datos comerciales, las migraciones y las políticas RLS permanecen sin cambios en este corte.

## Estado verificado

- Proyecto: `Viagelato-ECommerce` (ref `mxopaakzlmjbnrwolpgh`). Estado: `ACTIVE_HEALTHY`.
- Base PostgreSQL: ~12 MB (12.687.027 bytes) de 500 MB disponibles (aprox. 2,4 %).
- Tablas en `public`: 14; RLS activado: **14 de 14**.
- Avisos de índices sin uso: 9. **No eliminarlos** sin métricas representativas de uso; pueden ser necesarios cuando crezcan ventas y pedidos.
- Supabase Storage: no hay objetos listados en `storage.objects` al momento de esta consulta. La cuota y el tráfico efectivo de Storage deben confirmarse por separado en el dashboard.
- Lo que no podemos deducir mediante el tamaño SQL: consumo mensual real de egress/MAU, almacenamiento externo y total del tráfico CDN.

## Límites y decisiones del plan

| Recurso | Free | Decisión para Viagelato |
| --- | --- | --- |
| Base de datos | 500 MB por proyecto | Sin tablas nuevas de telemetría ni copias internas de pedidos |
| Archivos | 1 GB | Imágenes JPG/PNG/WEBP limitadas a 3 MB por la API; comprimir imágenes antes de subir |
| Egress | 5 GB/mes | Cargar los estilos de administración solo en `/admin`; reducir cargas innecesarias |
| MAU | 50.000/mes | Acceso admin existente; no exigir usuarios registrados para comprar por WhatsApp |
| Copias de seguridad | Sin backups automáticos incluidos | Ejecutar y conservar copias manuales **fuera de GitHub** |
| Protección contra contraseñas filtradas | Solo Pro+ | Usar claves robustas y **MFA TOTP** para administradores; no se debe considerar activo el chequeo de filtraciones |
| Branching de Supabase | No incluido | Probar migraciones en Docker local y no crear ramas de base con coste |
| Pausa por baja actividad | Puede ocurrir después de 7 días | Monitorizar el estado y disponer de procedimiento de reactivación; no confundir un `health` de Vercel con disponibilidad de la BD |

Fuentes: https://supabase.com/pricing y https://supabase.com/docs/guides/platform/backups

## Arquitectura implementada

1. `assertAdmin()` utiliza `cache()` de React **solo durante el render de una petición**, sin compartirse entre usuarios ni almacenar identidad entre peticiones. El servidor conserva la comprobación Auth + membresía real de `admin_users`.
2. El panel conserva los datos de negocio, mientras `AdminOverview` y `AdminProductRemovalDialog` se presentan como componentes independientes. Los botones siguen llamando a las mismas APIs autorizadas.
3. CSS exclusivo de `/admin` se importa desde su layout privado; los estilos necesarios para `/login` permanecen globales.
4. `reportServerFailure` escribe únicamente nombres de operaciones, fuentes permitidas y códigos SQLSTATE válidos. **Nunca incluye `error.message`, SQL, payloads, direcciones, teléfonos, correos, URLs de WhatsApp o tokens**. Los diagnósticos se revisan con las herramientas de logs del hosting ya conectado.
5. Las rutas de admin exigen Auth y origen autorizado; la recepción pública de pedidos verifica producto/precio/stock/envío e idempotencia en servidor antes de registrar un pedido.

## Copia manual segura (gratis)

**No existe en este corte un backup creado ni probado mediante restauración.** Procedimiento recomendado para la notebook de administración (Windows + Supabase CLI + Docker):

1. Abrí PowerShell, instalá la CLI según la documentación oficial y ejecutá `supabase db dump --help` para verificar flags de tu versión.
2. En una carpeta privada fuera de GitHub, creá `private-backups` y vinculá el proyecto correcto con `supabase link --project-ref mxopaakzlmjbnrwolpgh`. Autenticate únicamente en la CLI, sin copiar contraseñas a esta conversación.
3. Exportá esquema y datos por separado:

```powershell
supabase db dump --linked -f private-backups/viagelato_schema_20261103.sql
supabase db dump --linked --data-only --use-copy -f private-backups/viagelato_data_20261103.sql
```

4. Verificá que ambos archivos existan y no estén vacíos, almacenalos cifrados fuera del equipo, y validá el procedimiento de restauración **en un entorno de prueba local** antes de confiar en la copia.
5. Los dumps predeterminados excluyen esquemas administrados por Supabase (como `auth` y `storage`); tampoco incluyen los bytes de objetos de Storage. Si necesitás recuperación total de cuentas y archivos, planificá esos respaldos complementarios por un canal apropiado.
6. **Nunca ejecutes `supabase db reset --linked` contra producción**, ni subas backups, tokens, contraseñas o `.env` a GitHub.

Guía oficial: https://supabase.com/docs/reference/cli/supabase-db-dump y https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Seguimiento simple, sin gasto adicional

- **Semanal:** verificar inicio de sesión admin, solicitud WhatsApp de prueba sin envío real, errores de runtime y funcionamiento del carrito.
- **Mensual:** consultar el consumo real en el dashboard de Supabase (base, Storage, egress, MAU) y registrar el resultado fuera del repositorio. Si supera 70 %, investigar antes de alcanzar 85 %.
- **Antes de migrar:** generar backup manual, ejecutar Docker PostgreSQL efímero en CI, revisar RLS y obtener CI verde.
- **Tras publicar:** verificar commit en `main`, Vercel `READY`, dominio alias y ausencia de errores.

**Límite conocido:** los gráficos actuales de administración se calculan sobre un subconjunto de hasta 100 solicitudes WhatsApp. A futuro incorporar paginación por cursor y contadores agregados, sin descargar la totalidad de pedidos ni introducir tablas duplicadas.
