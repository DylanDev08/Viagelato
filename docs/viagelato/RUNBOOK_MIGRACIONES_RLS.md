# Viagelato — Runbook de migraciones, permisos y despliegues

**Propósito:** un procedimiento operativo seguro para intervenir la base Supabase exclusiva de Viagelato, validar RLS y confirmar GitHub → Vercel. Consultar el [estado auditado del 02/11/2026](ESTADO_SUPABASE_RLS_20261102.md) antes de trabajar.

## 0. Alcance y prohibiciones

- Proyecto objetivo: **Viagelato-ECommerce** / `mxopaakzlmjbnrwolpgh`. Confirmar el ID en el dashboard, nunca usar una base de FZAC por error.
- **No** pegar secretos, claves `service_role`, tokens, JWT, datos personales, números bancarios o datos de pedidos en documentación ni logs.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en servidor. Usar clave publicable solo en el frontend.
- En producción **no** ejecutar `supabase/schema.sql` ni todos los parches históricos ni el runner `npm run test:db`; ese runner usa un PostgreSQL efímero con datos ficticios.
- Una migración aplicada no se vuelve a aplicar por rutina. `supabase/migrations/` en Git no refleja necesariamente el **historial completo de migraciones remotas**.

## 1. Preparación de un cambio nuevo

1. Registrar el objetivo, las tablas/funciones afectadas, el impacto de permisos y el plan de reversión en una PR.
2. Revisar **las versiones remotas** con Supabase `list_migrations` o la herramienta `supabase migration list` si el proyecto está vinculado; cotejar el ID y el contenido del cambio propuesto.
3. Verificar esquema y políticas actuales mediante consultas **solo lectura**. Confirmar que el proyecto tiene 14 tablas `public` con RLS y que los cambios posteriores no han añadido otras.
4. Preparar una base de staging o descartable. Para un cambio nuevo, generar archivo de migración mediante **Supabase CLI** y registrar su SQL en la PR. No inventar versiones ni editar el historial de migraciones aplicado.
5. Ejecutar `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:db` (requiere Docker), `npm audit --omit=dev --audit-level=moderate` y `npm run build`.
6. Probar el cambio con los roles `anon`, `authenticated` y `service_role` sin dar a los dos primeros acceso de administración.
7. Antes de aplicar DDL en producción, respaldar la base y fijar un período de cambio; preferir operaciones aditivas, reversibles y sin reescrituras masivas.

## 2. Consultas de comprobación (solo lectura)

Ejecutar en SQL Editor del **proyecto correcto**. No usan nombres, importes ni información de clientes.

```sql
-- Tablas y RLS
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;

-- Políticas vigentes y ámbito de cada una
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname='public'
order by tablename, policyname;

-- Funciones públicas ejecutables por roles cliente: resultado esperado = 0
select count(*) as funciones_expuestas
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and (has_function_privilege('anon',p.oid,'execute')
    or has_function_privilege('authenticated',p.oid,'execute'));

-- Secuencias con privilegio público: resultado esperado = 0
select c.relname
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='S'
  and (has_sequence_privilege('anon',c.oid,'usage')
    or has_sequence_privilege('anon',c.oid,'select')
    or has_sequence_privilege('authenticated',c.oid,'usage')
    or has_sequence_privilege('authenticated',c.oid,'select'));
```

**Verificación de privilegios de tablas:** consultar `has_table_privilege('anon','public.orders','select')` y su equivalente para `authenticated`. Para `orders`, `payment_settings`, `admin_users`, `whatsapp_order_requests`, eventos y pagos debe dar `false` para operaciones públicas. Para `products`/`banners`/`categories`/`shipping_zones`/`site_settings` solo se permite lectura según la política.

## 3. Matriz de acceso esperada

| Actor | Catálogo público | Pedidos / pagos / banco / admin_users | Mutaciones de panel |
| --- | --- | --- | --- |
| `anon` | Lectura según políticas | Sin privilegios | Denegadas |
| `authenticated` (cliente genérico) | Lectura según políticas | Sin privilegios directos | Denegadas |
| `service_role` (servidor) | Acceso técnico | Acceso privilegiado | Solo después de autorización de aplicación |

**Atención:** `service_role` puede eludir RLS. **RLS no autentica al administrador**: las rutas de Next.js deben validar `getUser()`, pertenencia a `admin_users`, origen permitido y datos de entrada antes de ejecutar consultas privilegiadas. No ejecutar esas consultas en componentes cliente.

## 4. Migraciones: orden operativo

**Base nueva descartable:** el runner de integración aplica `supabase/schema.sql`, `supabase/patches/*.sql` en orden y `supabase/migrations/*.sql` en orden. Esto es una **prueba de reconstrucción local**, no una instrucción para reconstruir producción.

**Base existente en producción:**

1. Consultar el historial remoto y obtener el diff de esquema frente a la migración propuesta.
2. Si la versión ya aparece aplicada, **no ejecutarla otra vez**; validar objeto y permisos reales.
3. Si falta, verificar dependencias y realizar ensayo en staging, respaldo y aprobación antes de aplicar el SQL.
4. Aplicar únicamente la migración revisada a través de un mecanismo con historial (Supabase CLI o conector de migraciones), nunca `npm run test:db` contra producción.
5. Repetir las consultas de RLS y privilegios; ejecutar los asesores de seguridad y de rendimiento.
6. Si la validación falla, **detener el despliegue de aplicación**; evaluar una migración compensatoria revisada o restauración del respaldo. No revertir a ciegas abriendo acceso a `anon`.

**Migración 20261102115243 ya aplicada:** `viagelato_rls_default_grants_lockdown`. Revocó permisos por defecto de objetos futuros creados por `postgres` y retiró `USAGE`/`SELECT`/`UPDATE` de secuencias actuales para `anon/authenticated`. No modifica tablas de negocio ni vuelve privada la información que debe ser pública. No volver a ejecutarla como parte de un paquete genérico.

## 5. Publicación GitHub → Vercel

1. Dejar la migración y las pruebas de regresión versionadas en rama propia y PR.
2. Verificar GitHub Actions: tests, lint, TypeScript, PostgreSQL, auditoría bloqueante de dependencias de producción y build; las alertas del tooling de desarrollo tienen seguimiento en la Issue #40.
3. Comprobar que Vercel Preview esté `READY` y que su SHA coincida con la cabeza de la PR.
4. Fusionar solo tras esos controles. Comprobar el deployment **Production** `READY`, el SHA resultante de `main` y el alias `viagelato.vercel.app` apuntando al deployment nuevo.
5. Revisar errores de runtime, rutas públicas, página de producto, carrito y sesión admin. **No generar pedidos ni transferencias reales durante QA**; para flujos de escritura, usar staging y datos de prueba.
6. Mantener `ENABLE_CHECKOUT=false` para el circuito legado hasta validarlo explícitamente. `POST /api/whatsapp-request` es el circuito comercial vigente y se controla por separado. Mantener `ENABLE_INDEXING=false` hasta la aprobación de SEO y contenido.

## 6. Pendientes conocidos

- `supabase_admin` tiene ACL de objetos futuros administradas por la plataforma; **no es posible modificarlas desde `postgres`**. En el corte no había relaciones ni funciones de ese dueño en `public`. Evitar instalar extensiones en `public` y comprobar el propietario de cualquier objeto nuevo (Issue [#43](https://github.com/DylanDev08/Viagelato/issues/43)).
- Security Advisor: **Leaked Password Protection Disabled**. Activar mediante Supabase Auth si el plan lo permite; no corresponde a una migración RLS.
- Los avisos `rls_enabled_no_policy` de las nueve tablas internas reflejan denegación total intencional; **no** crear políticas de lectura públicas para eliminarlos.
- Las pruebas de PostgreSQL efímero y el CI no certifican Supabase Auth, Storage ni checkout completo en un navegador real.

## Referencias

- [Estado auditado de Supabase](ESTADO_SUPABASE_RLS_20261102.md)
- [Preparación del administrador](admin-setup.md)
- [Pruebas PostgreSQL](../../tests/integration/postgres/README.md)
- [Seguridad Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Nota oficial sobre privilegios de `supabase_admin`](https://supabase.com/kb/troubleshooting/cant-change-the-default-privileges-of-supabase_admin-in-the-public-schema)
