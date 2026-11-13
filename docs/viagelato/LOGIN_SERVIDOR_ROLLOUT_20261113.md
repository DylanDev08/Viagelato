# Inicio de sesión de administrador por servidor (rollout controlado)

**Fecha:** 2026-11-13  
**Proyecto:** Viagelato. No aplica a FZAC ERP ni a otros proyectos.

## Qué cambia

- `POST /api/auth/admin-login` valida origen, JSON, limitador PostgreSQL (5 intentos por IP cada 15 minutos) y Turnstile si se configuró.
- El servidor consulta Supabase Auth y **verifica el usuario mediante `getUser()`** y su registro en `admin_users`.
- Crea cookies de sesión `viagelato-admin-server-v1` (incluidos fragmentos `.0`, `.1`, etc.) con **HttpOnly, SameSite=Lax, Secure en producción, Path=/**.
- `src/proxy.ts` verifica primero la sesión nueva y renueva las cookies. Las páginas y API vuelven a validar el rol con `assertAdmin()`.
- `POST /api/auth/admin-logout` revoca la sesión local y limpia todos los fragmentos. Los clientes previos siguen pudiendo cerrar sesión sin afectar a otros dispositivos.
- Las cookies nuevas son independientes del cliente de navegador y de la recuperación de contraseña antigua. No se devuelven tokens en las respuestas JSON.

## Pasos de activación sin bloquear al cliente

1. **Canary (primer despliegue):** dejar `NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED=false` o ausente. Configurar `ADMIN_SERVER_LOGIN_CANARY_ENABLED=true` como variable privada de Vercel **Production** y desplegar. En esta fase `/login` sigue usando el método anterior.
2. **Prueba con una cuenta administradora real:** entrar a `https://viagelato.vercel.app/login?servidor=1`, iniciar sesión, comprobar que `GET /api/admin/session` responde `authorized:true`, abrir el panel, modificar **únicamente un borrador de prueba autorizado**, cerrar sesión y confirmar que `/admin` redirige a login. Usar otra pestaña para comprobar que el sitio público sigue funcionando. No compartir credenciales por chat.
3. **Activación global:** únicamente después de validar la prueba real, configurar `NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED=true` en Vercel Production y desplegar. Todo login normal utilizará servidor. Mantener el fallback legacy unas jornadas para las sesiones ya iniciadas.
4. **Rollback:** configurar `NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED=false` y desplegar; el login anterior permanece disponible. Si es necesario, desactivar también `ADMIN_SERVER_LOGIN_CANARY_ENABLED`.

## Condiciones de seguridad

- Las claves `SUPABASE_SERVICE_ROLE_KEY` y `CHECKOUT_RATE_LIMIT_SALT` siguen restringidas al servidor. No agregar prefijo `NEXT_PUBLIC_`.
- Las cookies HttpOnly **no se leen desde JavaScript**: la renovación sucede en Proxy y componentes del servidor, no desde el navegador.
- Las rutas API siguen exigiendo usuario real y rol de `admin_users`; ni el formulario ni la existencia de una cookie son autorización suficiente.
- Las respuestas de login y logout no se cachean, por riesgo de compartir cookies entre usuarios.
- La recuperación sigue usando enlaces de Supabase Auth, y al completar un cambio de contraseña intenta invalidar la cookie de servidor de ese dispositivo.
- Las pruebas automatizadas verifican modo canary, rechazo CSRF, rate limits, rol, respuesta sin tokens, cookies, logout y mantenimiento del acceso legacy. **No sustituyen una prueba con un administrador real.**

## Comprobaciones técnicas

En GitHub Actions se ejecutan Vitest, lint, TypeScript, migraciones de prueba y build de producción. Si un test falla, no fusionar. En Vercel verificar deploy `READY`, `/admin` sin sesión denegado, `/api/admin/session` respondiendo 401 sin sesión y CI responsive en verde.

