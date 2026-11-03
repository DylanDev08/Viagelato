# Viagelato — Paginación de pedidos, backups y escalado (Supabase Free)

Fecha: 03/11/2026. Sin herramientas premium ni modificaciones de RLS.

## Pedidos por páginas

- La pantalla de admin consulta 20 pedidos online y 20 solicitudes WhatsApp por primera vez.
- `GET /api/admin/paginated-orders?kind=orders|whatsapp&cursor=...` usa Auth + `admin_users`, solo acepta tipos conocidos y cursor validado, y entrega **20 registros** por solicitud.
- La consulta ordena por `created_at DESC, id DESC`, filtra por cursor de fecha+UUID y solicita un registro adicional para saber si hay otra página sin `count(*)`.
- La respuesta incluye `Cache-Control: private, no-store`; los datos nunca se publican a usuarios anónimos.
- El botón **Cargar 20 anteriores** conserva el estado de los pedidos ya cargados y evita duplicados por ID.
- Filtros y contadores de WhatsApp solo abarcan las páginas cargadas. **No son totales históricos**; próximamente, si hace falta, usar consultas agregadas sobre la BD sin descargar todos los clientes.

### Verificación
Probar abrir el panel, administrar la primera página, cargar páginas siguientes, buscar por SKU, actualizar estados y recuperar la sesión. Los movimientos de pagos conservan su RPC e idempotencia.

## Backup semanal cifrado, sin Supabase Pro

Workflow: `.github/workflows/supabase-free-backup.yml`.

- Se ejecuta cada domingo 07:20 (Argentina), o desde **GitHub → Actions → Encrypted Supabase Free backup → Run workflow**.
- Usa `pg_dump` PostgreSQL 17 con conexión privada a la BD, formato custom y únicamente el esquema `public`.
- Cifra el archivo con GPG AES-256 usando una frase secreta de respaldo **no almacenada en el código**.
- Verifica que el archivo puede desencriptarse y que `pg_restore --list` reconoce su contenido.
- Solo sube `.dump.gpg` + SHA256, nunca el dump plano. Se conservan 21 días como artefacto de GitHub Actions.
- El dump temporal se borra del runner después de cifrar. Esto no sustituye cifrado del runner ni almacenamiento externo independiente.

### Configuración pendiente para activar backups

En **GitHub → Viagelato → Settings → Secrets and variables → Actions**, crear:

1. `SUPABASE_BACKUP_DATABASE_URL`: cadena de conexión de PostgreSQL obtenida del panel de Supabase (preferentemente **Session pooler** compatible con IPv4), usuario de BD con permisos suficientes para `pg_dump`. No usar URL REST ni clave anon/service_role.
2. `SUPABASE_BACKUP_PASSPHRASE`: contraseña aleatoria fuerte de al menos 24 caracteres, guardada **fuera de GitHub** en un gestor seguro; no compartirla por chat ni dejarla en un archivo del repositorio.

**Sin estos secretos no existe respaldo automático**: el job falla de forma explícita y no publica un artefacto vacío. Después de configurarlos, ejecutar manualmente el workflow una vez, verificar `SUCCESS` y descargar el artefacto cifrado. Guardar también copia cifrada fuera de GitHub para independencia de la plataforma.

### Restauración / verificación (no ejecutar en producción sin plan)

En una máquina segura con `gpg`, `docker` y el artefacto descargado:

```bash
sha256sum -c viagelato-public.dump.gpg.sha256
gpg --output viagelato-public.dump --decrypt viagelato-public.dump.gpg
docker run --rm -i -v "$PWD:/backup" postgres:17-alpine pg_restore --list /backup/viagelato-public.dump
```

`pg_restore --list` **no es una restauración probada**. Restaurar en una base local descartable para comprobar integridad y compatibilidad de dependencias; `public` puede referenciar `auth.users` y extensiones, que requieren bootstrap previo. Nunca ejecutar `pg_restore` contra producción por accidente.

**Limitación importante:** el dump de `public` NO incluye usuarios de `auth`, archivos físicos de `storage`, configuración Auth, secrets, deployments, ni copia de la organización. Para recuperación completa también se necesita planificar exportación de identidades y los archivos. Las cuentas administrativas pueden necesitar reconstrucción/verificación de identidades. No es un backup integral de Supabase.

## Auditoría del panel: siguiente fase

| Prioridad | Diagnóstico | Acción siguiente |
| --- | --- | --- |
| Alta | Los filtros de WhatsApp aplican solo a páginas descargadas | Mantener etiqueta de cobertura; implementar búsquedas/filtros de backend solo con índices y si el volumen lo justifica |
| Alta | Backups sin credenciales ni restauración probada aún | Configurar los 2 secretos, ejecutar primera copia, hacer simulacro de restauración |
| Media | `AdminDashboard` sigue siendo un componente grande | Extraer pestañas por responsabilidades sin cambiar permisos, y dividir CSS por ruta |
| Media | Inventario y categorías se cargan completos en admin | Paginación de catálogo y búsqueda en servidor cuando supere unas centenas de SKU |
| Media | Eventos de pago WhatsApp y pedidos | Mantener RPC atómicas, idempotencia y auditoría por actor; no hacer borrados por cascada |
| Baja | 9 índices aún sin usos registrados | No eliminarlos antes de observar carga representativa |
| Baja | Telemetría | Logs mínimos de errores sin PII; no incorporar SaaS pago |

## Límites de Free

Base de datos 500 MB; archivos 1 GB; backups automáticos gestionados de Supabase requieren plan pago. Vigilar consumo real de egress/Storage/MAU en consola. No se crearon ramas de Supabase ni tablas de eventos extras para esta fase.

Referencias:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/using-secrets-in-github-actions
