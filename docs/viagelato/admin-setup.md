# Activación del administrador — Viagelato

Este procedimiento es exclusivo del proyecto Supabase `mxopaakzlmjbnrwolpgh` (`Viagelato-ECommerce`). No utilizar proyectos FZAC.

## 1. Condiciones previas

- La migración inicial `viagelato_initial_schema_20261028` debe existir.
- Vercel y Render deben tener `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
- La clave `SUPABASE_SERVICE_ROLE_KEY` es privada; NUNCA se guarda en GitHub, en el navegador ni en variables `NEXT_PUBLIC_*`.
- `ENABLE_CHECKOUT=false` y `ENABLE_INDEXING=false` hasta terminar las pruebas.

## 2. Crear una cuenta real en Auth

Desde el [dashboard de Auth del proyecto](https://supabase.com/dashboard/project/mxopaakzlmjbnrwolpgh/auth/users), entrar a **Users → Add user**.
Crear la cuenta con un correo autorizado, una contraseña privada robusta y el flujo de confirmación correspondiente. No compartir la contraseña por chat.

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

## 5. Orígenes y proxy

El frontend usa la URL canónica en `NEXT_PUBLIC_SITE_URL` (por ejemplo `https://viagelato.vercel.app`); el servidor Render acepta esa dirección al recibir solicitudes administrativas reenviadas desde Vercel, además del host propio. Los sitios ajenos y las peticiones mutantes sin `Origin` son rechazados.

Para probar un **dominio preview concreto** sin acceso a producción, se puede añadir en **Render, solo en servidor**, `ADMIN_ALLOWED_ORIGINS=https://preview-exacto.vercel.app`. No usar comodines, dominios genéricos ni habilitar orígenes de terceros. Revisar que el preview sea del proyecto Viagelato.

## 6. Límite actual

Las pruebas unitarias y de CI no reemplazan una verificación de login y CRUD reales. Cuando Vercel permita desplegar la rama probada, sincronizar la versión de Render antes de las pruebas end-to-end.

Nunca enviar claves privadas, credenciales de usuarios o datos bancarios en issues, pruebas ni documentación.
