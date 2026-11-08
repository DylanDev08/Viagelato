# Backlog de migraciones propuestas — no confundir con las aplicadas

**Estado del documento:** actualizado el 02/11/2026. Las frases históricas "no se aplicó ninguna migración" ya no describen el estado actual.

## Cambios que ya existen en producción

Supabase `Viagelato-ECommerce` (`mxopaakzlmjbnrwolpgh`) registra 10 migraciones. La última, `20261102115243_viagelato_rls_default_grants_lockdown`, **ya está aplicada**, versionada en Git y validada con pruebas de permisos. Consultar [estado del esquema y RLS](ESTADO_SUPABASE_RLS_20261102.md) y [runbook de migraciones](RUNBOOK_MIGRACIONES_RLS.md).

## Propuestas que NO están autorizadas ni implementadas por este corte

- Galería de múltiples imágenes por producto si la experiencia comercial lo exige.
- Adjuntos privados para comprobantes de transferencia, con política explícita de acceso y retención.
- Auditoría editorial de cambios de contenido institucional, si existe necesidad operativa.

Ninguna de estas propuestas debe convertirse en SQL de producción sin especificación, impacto sobre permisos/RLS, pruebas de staging y aprobación comercial. **No ejecutar de nuevo el esquema inicial ni los parches históricos para 'actualizar' una base existente.**

## Próxima migración

Generarla con Supabase CLI, comprobar el historial remoto, revisarla en PR y aplicarla de forma individual siguiendo el runbook. Incluir verificación de permisos de `anon`, `authenticated` y `service_role`, y que los nuevos objetos no hereden privilegios públicos.
