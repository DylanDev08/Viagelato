# Configuración segura de Supabase para Viagelato

1. Crear un proyecto nuevo y exclusivo para Viagelato. No reutilizar FZAC-ERP.
2. Copiar `.env.example` a `.env.local` y reemplazar todos los valores de ejemplo. `SUPABASE_SERVICE_ROLE_KEY`, `CHECKOUT_RATE_LIMIT_SALT` y `CRON_SECRET` son secretos exclusivos del servidor.
3. Ejecutar `supabase/schema.sql` en el SQL Editor del proyecto nuevo.
4. Crear el usuario administrador en Authentication y agregar su UUID a `public.admin_users` usando la sentencia comentada al final del esquema.
5. Mantener los productos ocultos hasta completar verificación comercial, SKU, precio y stock.
6. Configurar cada zona con tarifa confirmada. Activar individualmente la elegibilidad para envío gratis.
7. Configurar y habilitar al menos un medio de pago. La transferencia exige alias, CBU/CVU y titular.
8. Mantener retiro deshabilitado hasta recibir confirmación comercial.
9. Programar `POST /api/cron/expire-reservations` con `Authorization: Bearer <CRON_SECRET>` cada cinco minutos. La liberación también se ejecuta al crear pedidos como segunda defensa.
10. Ejecutar los asesores de seguridad y rendimiento de Supabase y verificar RLS y permisos explícitos de Data API.
11. Recién después de las pruebas extremas, cambiar `ENABLE_CHECKOUT=true`.

## Datos que siguen pendientes del comercio

- Precios, stock, SKU y presentación definitiva.
- Tarifa debajo de ARS 60.000 y días de entrega.
- Datos bancarios y métodos aceptados al recibir.
- Confirmación de retiro y WhatsApp.
- Textos legales definitivos.
