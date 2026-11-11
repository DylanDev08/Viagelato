# Viagelato — ajustes comerciales solicitados (11/11/2026)

## Confirmaciones del cliente

1. **Portada:** reemplazar la composición visual de productos por la pieza de Sei Tu “Tentate” enviada por WhatsApp. La imagen exacta se recibió como adjunto de conversación, pero todavía no se añadió como asset público de la web. La portada acepta imágenes del panel mediante `site_settings.hero_image_url`; ahora las muestra completas y sin un aviso superpuesto.
2. **Envío gratuito:** desde ARS 60.000 de subtotal de productos, inclusive, en las zonas habilitadas. Este umbral ya estaba configurado en Supabase y se conserva.
3. **Zonas confirmadas (15):** Temperley, Lomas de Zamora, Banfield, Remedios de Escalada, Lanús Este, Lanús Oeste, Valentín Alsina, Gerli, Piñeyro, Dock Sud, Villa Domínico, Sarandí, Wilde, Bernal y Capital Federal.
4. **Mini torta Cookies (fila 32):** categoría "Postres y especiales"; caja de 8 unidades; sin la frase "peso no especificado". Se preserva SKU y precio.

## Implementación y resguardos

- `DELIVERY_AREAS` mantiene la lista comercial pública y alimenta el formulario de pedidos y la página de envíos.
- `quoteShipping` valida esas zonas en frontend y API; "Lanús" se sigue aceptando para pedidos históricos y "CABA" como alias de Capital Federal.
- Fuera de las 15 zonas, el costo/fecha/cobertura se cotizan por WhatsApp; no hay cargo automático de ARS 60.000. El retiro local sigue gratuito cuando se habilite.
- En Supabase se agregaron las 11 zonas nuevas al registro administrativo **inactivas y sin tarifas inventadas**. Su cobertura comercial para envío gratis sigue definida en código; las tarifas de pedidos inferiores al mínimo permanecen pendientes.
- La fila 32 se corrigió en Supabase y en la fuente JSON de desarrollo; `active` permaneció `false`, sin publicar productos nuevos.
- Las pruebas del umbral y Capital Federal fueron actualizadas.
- **Pendiente:** colocar el archivo promocional original en un almacenamiento público y establecer `site_settings.hero_image_url` para activar el reemplazo visual. No usar un enlace efímero a archivos de chat ni imágenes ajenas.
