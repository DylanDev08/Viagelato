-- Corte 03 · Elegibilidad comercial confirmada en Viagelato_catalogo_y_envios.xlsx.
-- La promoción sólo se aplicará cuando haya tarifa, stock, medios de pago y checkout habilitados.
-- Esta actualización NO activa cobertura ni asigna costos de envío.
update public.shipping_zones
set free_shipping_eligible=true
where name in ('Lomas de Zamora','Lanús','Banfield','Avellaneda','Valentín Alsina','Don Bosco','Wilde')
  and cost is null and ready=false and active=false and free_shipping_eligible=false;
