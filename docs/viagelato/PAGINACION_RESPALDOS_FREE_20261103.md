# Viagelato — Paginación y respaldos compatibles con Supabase Free
Actualizado: 03/11/2026. Proyecto `mxopaakzlmjbnrwolpgh`.

## Paginación implementada

- El panel descarga inicialmente **25 pedidos online** y **25 solicitudes WhatsApp**.
- Cada sección incluye **«Cargar 25 más»**, que consulta `GET /api/admin/pages?kind=orders|requests&cursor=...`.
- El cursor ordena por `created_at DESC, id DESC`. Evita el uso de `OFFSET` en páginas cada vez más profundas y funciona incluso con fechas repetidas.
- La API es de **solo lectura** y requiere sesión Supabase válida **y membresía en `admin_users`**. No depende del enlace admin ni de un filtro en navegador.
- El cursor es un token de posición, **no un token de autorización**. Zod valida la fecha y el UUID; el servidor fija las tablas/columnas; inputs arbitrarios se rechazan.
- Páginas protegidas con `no-store`, límite fijo de 25 y sin opción para pedir todos los registros.
- Las acciones de confirmación, pagos, preparación y cancelación continúan en los endpoints existentes y conservan las confirmaciones humanas. El refresco de Next reconstruye la primera página después de cambios.
- Los filtros y los indicadores de WhatsApp operan **solo sobre las solicitudes cargadas**. A futuro, agregar filtros del lado del servidor y contadores agregados cuando el volumen lo justifique.

### Verificaciones

`npm test`, `npm run lint`, `npm run typecheck`, `npm run test:db`, `npm audit --omit=dev --audit-level=moderate`, `npm run build`.

## Respaldo completo del negocio (manual, sin plan Pro)

Supabase Free **no brinda un sistema administrado de backups diarios/restauración**. Se implementan scripts locales de exportación lógica (sin infraestructura paga) y cifrado asimétrico GPG. Este método evita depositar datos sensibles en el repositorio público de Viagelato.

**Los scripts todavía no se han ejecutado contra producción y NO constituyen una copia restaurada verificada.**

Requisitos en Windows:
1. Docker Desktop funcionando y Gpg4win instalado.
2. Una clave GPG pública/privada propia, con fingerprint de 40 caracteres. **Guardar una copia segura y privada de la clave de descifrado en otro lugar**; sin ella el respaldo es irrecuperable.
3. Desde el proyecto Supabase correcto, obtener en **Connect → Session pooler** una cadena PostgreSQL del proyecto Viagelato. Para la conexión se necesita la contraseña de la base. No la copies al chat, correo ni GitHub.
4. Ejecutar en PowerShell, desde la raíz del repositorio:

```powershell
.\scripts\backup-viagelato-setup.ps1
.\scripts\backup-viagelato.ps1 -OffsiteDir "E:\ResguardosPrivados"
```

La carpeta offsite debe existir previamente; puede ser un disco externo cifrado o carpeta privada sincronizada cifrada. Sin `-OffsiteDir` el backup queda solo en `Documents\Viagelato-Backups`, por lo que **todavía no es un respaldo offsite**.

### Programación semanal (opcional)

```powershell
.\scripts\backup-viagelato-setup.ps1 -RegisterWeeklyTask
```

La tarea se registra el domingo a las 10:00 de la máquina Windows. Solo se ejecuta **con la sesión del mismo usuario iniciada**, porque la contraseña se protege con DPAPI y el llavero GPG pertenece a ese usuario. No se aloja ni ejecuta en Supabase; si la computadora está apagada o sin sesión, se omite esa ejecución. Confirmar los archivos generados cada semana.

### Controles del script

1. Comprueba que la cadena PostgreSQL pertenece a `mxopaakzlmjbnrwolpgh`.
2. Exporta `public` con PostgreSQL 17 (`pg_dump` formato custom, incluye esquema y datos, no solamente estructura). El archivo sin cifrar permanece en un directorio temporal privado.
3. Verifica el formato con `pg_restore --list`.
4. Cifra con el fingerprint GPG configurado. Genera `.dump.gpg`, `.sha256` y `.json` con metadatos **sin datos personales**.
5. Si se proporciona `-OffsiteDir`, copia los tres archivos a esa ubicación y comprueba el SHA256.
6. Borra la copia temporal sin cifrar; conserva hasta 12 copias cifradas locales por defecto.
7. Si alguna operación falla no anuncia un backup válido.

**Prueba de integridad de una copia:**

```powershell
.\scripts\backup-viagelato-verify.ps1 -EncryptedFile "C:\Ruta\viagelato_public_YYYYMMDDTHHMMSSZ.dump.gpg"
```

Esta verificación prueba hash, descifrado y estructura SQL, pero **no sustituye una restauración completa en una instancia desechable**. Nunca restaurar un dump de prueba sobre producción.

### Qué NO cubre

- Esquemas administrados `auth` y `storage`; usuarios de Supabase Auth, enlaces de recuperación, credenciales y configuraciones del Dashboard.
- Archivos binarios almacenados en Supabase Storage (en el momento de la última revisión no había objetos listados; hay que verificarlo nuevamente antes del lanzamiento).
- Secretos de Vercel, integraciones externas, nombres de dominio y configuración del hosting.
- Restauración punto-en-tiempo (PITR), alta disponibilidad ni respaldo físico.

Para recuperación completa se necesita además: control de acceso a cuentas de administración, copia segura de la configuración del proyecto, migraciones versionadas de GitHub y respaldo adicional de Storage si se empiezan a subir archivos.

## Auditoría de escalabilidad — prioridades futuras

| Riesgo | Acción futura | Cuándo aplicar |
| --- | --- | --- |
| La bandeja de WhatsApp solo filtra entre las páginas cargadas | Búsqueda/estado en SQL con índices de fecha y estado | Al superar cientos de solicitudes |
| Resumen del admin calcula pendientes sobre registros cargados | Consultas agregadas COUNT en servidor (sin duplicar tablas) | Si se requieren cifras de todo el historial |
| Listado de productos siempre carga todos | Paginación + búsqueda por SKU/nombre desde servidor | Catálogo por encima de 300–500 SKU |
| Componentes de admin con múltiples formularios | Extraer gestión de categorías, zonas y ajustes | Antes de sumar módulos |
| Subidas de fotos y plan Free Storage | Compresión WebP, límites de tamaño y políticas de limpieza segura | Cuando Storage/egress supere 70 % |
| Backups solo locales | Ubicación privada offsite + ensayo de restauración trimestral | Inmediatamente después de la primera copia |
| Errores de administración | Telemetría sanitizada sin PII con logs existentes Vercel | Al aumentar el uso |
| Picos de lectura públicos | Consultas seleccionando solo columnas necesarias, caché limitada segura | Si aumenta el tráfico o egress |

No introducir una cola, Redis, microservicios, nuevas tablas de logs ni planes pagos solo por anticipación. Medir primero el uso real.

Referencias oficiales: https://supabase.com/docs/guides/platform/backups , https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore .
