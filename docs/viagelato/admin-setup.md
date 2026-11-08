# Activación del administrador — Viagelato

**Guía operativa actualizada al 02/11/2026.** Para el estado de la base y sus permisos, ver [auditoría RLS](ESTADO_SUPABASE_RLS_20261102.md).

Este procedimiento es exclusivo del proyecto Supabase `mxopaakzlmjbnrwolpgh` (`Viagelato-ECommerce`). No utilizar proyectos FZAC.

## 1. Condiciones previas

- La migración inicial `viagelato_initial_schema_20261028` debe existir.
- Vercel (rutas `/admin`, `/api/admin/*` y `/api/whatsapp-request`) debe tener la configuración correcta de Supabase. Render solo necesita las variables pertinentes al checkout/cron legado si se utilizan; no configurar claves innecesarias en servicios adicionales.
- La clave `SUPABASE_SERVICE_ROLE_KEY` es privada; NUNCA se guarda en GitHub, en el navegador ni en variables `NEXT_PUBLIC_*`.
- `ENABLE_CHECKOUT=false` y `ENABLE_INDEXING=false` hasta terminar las pruebas.

## 2. Crear una cuenta real en Auth

Desde el [dashboard de Auth del proyecto](https://supabase.com/dashboard/project/mxopaakzlmjbnrwolpgh/auth/users), entrar a **Users → Add user**.
Usar **Send invitation** para el correo del administrador designado (`dylansalcedo333@gmail.com`). La invitación permite configurar una contraseña nueva y robusta desde un enlace privado recibido por email. Evitar reutilizar contraseñas compartidas en conversaciones y no incluir contraseñas en GitHub.

Tomar únicamente el `UUID` del nuevo usuario. No confundirlo con el ID de organización o proyecto.

## 3. Autorizar el usuario (operación restringida)

En el [SQL Editor del proyecto](https://supabase.com/dashboard/project/mxopaakzlmjbnrwolpgh/sql/new), luego de revisar que se trata del proyecto Viagelato, ejecutar:

```sql
-- Reemplazar exclusivamente el UUID por el de Auth → Users.
insert into public.admin_users(user_id)
values ('UUID-REAL-DEL-USUARIO')
on conflict (user_id) do nothing;
```

Para verificar sin exponer emails ni contraseñas:

```sql
select count(*) as admin_count from public.admin_users;
```

No modificar las políticas RLS para permitir a visitantes leer `admin_users`. La autorización se verifica en el servidor mediante Supabase Auth y la tabla `admin_users`.

## 4. Probar el acceso real

1. Ingresar a `https://viagelato.vercel.app/login` con la cuenta creada.
2. La página comprueba `GET /api/admin/session` antes de entrar a `/admin`.
3. Si la cuenta no está autorizada, se rechaza el acceso.
4. Subir una imagen JPG, PNG o WEBP de menos de 3 MB a un producto en borrador.
5. Verificar que el archivo aparezca en el bucket `images` y que el producto no se publique hasta validar datos, SKU, imagen y precio.
6. Probar crear/editar categoría y producto, ocultar un producto, banner y zona de envío. No habilitar pagos ni realizar pedidos reales.

## 5. Orígenes y proxy (actualizado al 02/11/2026)

El panel y sus rutas `/api/admin/*` son servidos por **Vercel** en el mismo origen que la sesión. La regla de `next.config.ts` redirige **solo** `/api/checkout` y `/api/cron/:path*` al `API_ORIGIN` legado en Render. No duplicar endpoints administrativos ni sus credenciales entre servicios.

Las mutaciones de administración requieren `Origin` en la lista de orígenes confiables; no se confía en el encabezado `Host` ni en `request.url` como autorización. El origen público es `https://viagelato.vercel.app`; si se usa una URL Preview específica para hacer **escrituras**, configurar `ADMIN_ALLOWED_ORIGINS` exclusivamente en el entorno servidor necesario, con origen HTTPS exacto, sin comodines. El preview sin configurar puede compilar y mostrar la web, pero **rechazar mutaciones**: eso es intencional.

Los cambios del servidor exigen sesión Supabase Auth válida y membresía en `admin_users` antes de usar `service_role`. Ocultar `/admin` del footer no sustituye ese control de acceso.

## 6. Límite actual

Las pruebas unitarias y de CI no reemplazan una verificación de login y CRUD reales. El panel ya está desplegado en Vercel. Aun con CI aprobado, siguen pendientes pruebas end-to-end de autenticación y operaciones reales en staging; no se requiere sincronizar Render para el CRUD administrativo.

Nunca enviar claves privadas, credenciales de usuarios o datos bancarios en issues, pruebas ni documentación.


## 7. Flujo de carga del catálogo provisional

En **Administración → Productos**, abrir **Elegir imagen del catálogo provisional**. Buscar el producto y seleccionar **Usar en borrador**. El formulario toma exclusivamente el nombre provisorio y la foto disponible en `public/catalogo`.

- SKU, precio, presentación, descripción y stock permanecen sin confirmar.
- La publicación permanece desactivada hasta cumplir las validaciones comerciales.
- Guardar cada ficha como borrador. Se admite cualquier cantidad de borradores sin SKU; la API convierte los SKU vacíos a `NULL` para evitar conflictos de unicidad.
- Las imágenes de marca no aparecen en el selector.
- Las categorías se vinculan automáticamente solo cuando existe una categoría con nombre coincidente; de otro modo se elige manualmente una real.
- Los datos actuales del catálogo son candidatos, no un inventario confirmado.

Para probar guardado, iniciar sesión con una cuenta real incluida en `admin_users` y comprobar el producto resultante en Supabase. No usar la cuenta del público ni credenciales inventadas.
