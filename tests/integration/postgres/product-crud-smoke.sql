\set ON_ERROR_STOP on
-- CRUD real sobre PostgreSQL 17 DESCARTABLE. Sin credenciales de producción.
BEGIN;

DO $$
DECLARE
  product_id uuid:='70000000-0000-4000-8000-000000000013';
  returned_id uuid;
  new_name text;
  new_price numeric;
  new_sku text;
  new_stock integer;
  new_visible boolean;
  deleted_count integer;
BEGIN
  -- Crear: el borrador no debe quedar publicado ni inventar existencias.
  INSERT INTO public.products(
    id,name,slug,description,price,stock,sku,presentation,
    image_url,commercially_verified,active,catalog_visible,featured
  ) VALUES (
    product_id,'Viagelato CRUD de prueba','viagelato-crud-prueba-2026',
    'Producto ficticio creado solo para ensayar CRUD.',12500,0,
    'VIA-CRUD-SMOKE-2026','Caja x8','/catalogo/crud-prueba.webp',
    false,false,false,false
  ) RETURNING id INTO returned_id;
  IF returned_id IS DISTINCT FROM product_id
    THEN RAISE EXCEPTION 'FALLÓ CREAR: id inesperado'; END IF;
  IF (SELECT stock FROM public.products WHERE id=product_id)<>0
    THEN RAISE EXCEPTION 'FALLÓ CREAR: se inventó stock'; END IF;

  -- Editar: debe persistir nombre, SKU, precio, presentación y descripción.
  UPDATE public.products
    SET name='Viagelato editado',
        description='Descripción comercial actualizada en CRUD transaccional.',
        price=13900,stock=0,sku='VIA-CRUD-EDITADO-2026',
        presentation='Caja de 8 unidades',catalog_visible=true
    WHERE id=product_id;
  SELECT name,price,sku,stock,catalog_visible
    INTO new_name,new_price,new_sku,new_stock,new_visible
    FROM public.products WHERE id=product_id;
  IF new_name<>'Viagelato editado' OR new_price<>13900
    OR new_sku<>'VIA-CRUD-EDITADO-2026' OR new_stock<>0 OR NOT new_visible
    THEN RAISE EXCEPTION 'FALLÓ EDITAR: no se persistieron campos'; END IF;

  -- Ocultar: no elimina el registro y nunca publica productos sin verificar.
  UPDATE public.products
    SET active=false,catalog_visible=false WHERE id=product_id;
  IF NOT EXISTS(SELECT 1 FROM public.products
    WHERE id=product_id AND active=false AND catalog_visible=false)
    THEN RAISE EXCEPTION 'FALLÓ OCULTAR'; END IF;

  -- Eliminar: sólo el borrador sin pedidos; la operación real es reversible.
  DELETE FROM public.products
    WHERE id=product_id AND active=false AND catalog_visible=false;
  GET DIAGNOSTICS deleted_count=ROW_COUNT;
  IF deleted_count<>1 OR EXISTS(SELECT 1 FROM public.products WHERE id=product_id)
    THEN RAISE EXCEPTION 'FALLÓ ELIMINAR'; END IF;
END $$;

ROLLBACK;
SELECT 'VIAGELATO_PRODUCT_CRUD_REAL_POSTGRES_OK' AS result;
