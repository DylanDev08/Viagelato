-- Viagelato: payment preference stored separately; no data loss, no automatic charges.
ALTER TABLE public.whatsapp_order_requests
 ADD COLUMN IF NOT EXISTS payment_preference text NOT NULL DEFAULT 'transfer';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='whatsapp_request_payment_preference_check' AND conrelid='public.whatsapp_order_requests'::regclass) THEN
  ALTER TABLE public.whatsapp_order_requests
   ADD CONSTRAINT whatsapp_request_payment_preference_check
   CHECK (payment_preference IN ('transfer','cash_on_delivery'));
 END IF;
END $$;
-- Backward compatibility for requests previously stored using a notes prefix.
UPDATE public.whatsapp_order_requests
SET payment_preference='cash_on_delivery',
    notes=regexp_replace(notes, '^Forma de pago preferida: Efectivo al recibir(\n|$)', '')
WHERE notes LIKE 'Forma de pago preferida: Efectivo al recibir%';
UPDATE public.whatsapp_order_requests
SET payment_preference='transfer',
    notes=regexp_replace(notes, '^Forma de pago preferida: Transferencia(\n|$)', '')
WHERE notes LIKE 'Forma de pago preferida: Transferencia%';

CREATE OR REPLACE FUNCTION public.admin_update_whatsapp_request(
 p_request_id uuid,p_action text,p_actor_user_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r public.whatsapp_order_requests%rowtype; next_status text;
BEGIN
 IF p_actor_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_actor_user_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 SELECT * INTO r FROM public.whatsapp_order_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_action='mark_paid' THEN RAISE EXCEPTION 'Usá la acción de acreditación con el importe efectivamente recibido'; END IF;
 IF p_action='cancel' THEN
  IF r.status='cancelled' THEN RETURN true; END IF;
  IF r.status='delivered' OR r.amount_paid>0 THEN RAISE EXCEPTION 'Revisá devolución antes de cancelar'; END IF;
  next_status:='cancelled';
 ELSIF p_action='contacted' AND r.status='draft' THEN next_status:='contacted';
 ELSIF p_action='confirmed' AND r.status='contacted' THEN
  IF NOT r.stock_confirmed OR r.shipping_cost IS NULL THEN RAISE EXCEPTION 'Falta confirmar stock y envío'; END IF;
  next_status:='confirmed';
 ELSIF p_action='preparing' AND r.status='confirmed' THEN
  IF NOT r.stock_confirmed OR r.shipping_cost IS NULL THEN RAISE EXCEPTION 'Falta verificar stock y envío'; END IF;
  IF r.payment_preference <> 'cash_on_delivery' AND (r.payment_status <> 'paid' OR r.amount_paid <> r.total) THEN
   RAISE EXCEPTION 'Falta acreditar la transferencia'; END IF;
  next_status:='preparing';
 ELSIF p_action='shipped' AND r.status='preparing' AND r.shipping_method='shipping' THEN next_status:='shipped';
 ELSIF p_action='delivered' AND (r.status='shipped' OR (r.status='preparing' AND r.shipping_method='pickup')) THEN
  IF r.payment_status<>'paid' OR r.amount_paid<>r.total THEN RAISE EXCEPTION 'Falta registrar el cobro real antes de marcar entrega'; END IF;
  next_status:='delivered';
 ELSE RAISE EXCEPTION 'Transición no permitida'; END IF;
 UPDATE public.whatsapp_order_requests SET status=next_status,updated_at=now() WHERE id=p_request_id;
 INSERT INTO public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 VALUES(p_request_id,p_actor_user_id,p_action,r.status,next_status);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.admin_update_whatsapp_request(uuid,text,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_whatsapp_request(uuid,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_record_whatsapp_cash(
 p_request_id uuid,p_actor_user_id uuid,p_amount numeric,p_payment_key uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r public.whatsapp_order_requests%rowtype; existing record;
BEGIN
 IF p_actor_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_actor_user_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF p_payment_key IS NULL OR p_amount IS NULL OR p_amount<=0 OR scale(p_amount)>2 THEN RAISE EXCEPTION 'Monto de efectivo inválido'; END IF;
 SELECT * INTO r FROM public.whatsapp_order_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT request_id,amount,payment_method INTO existing FROM public.whatsapp_request_payments WHERE idempotency_key=p_payment_key;
 IF FOUND THEN
  IF existing.request_id<>p_request_id OR existing.amount<>p_amount OR existing.payment_method<>'cash' THEN RAISE EXCEPTION 'Idempotencia reutilizada con otro cobro'; END IF;
  RETURN true;
 END IF;
 IF r.payment_preference<>'cash_on_delivery' OR NOT r.stock_confirmed OR r.shipping_cost IS NULL THEN RAISE EXCEPTION 'Pedido no configurado para efectivo al recibir'; END IF;
 IF NOT (r.status='shipped' OR (r.status='preparing' AND r.shipping_method='pickup')) THEN RAISE EXCEPTION 'El efectivo sólo se registra al efectuar la entrega'; END IF;
 IF p_amount <> r.total-r.amount_paid THEN RAISE EXCEPTION 'El monto cobrado debe saldar el importe pendiente'; END IF;
 INSERT INTO public.whatsapp_request_payments(request_id,idempotency_key,amount,transfer_reference,payment_method,recorded_by)
 VALUES(p_request_id,p_payment_key,p_amount,'','cash',p_actor_user_id);
 UPDATE public.whatsapp_order_requests SET amount_paid=total,payment_status='paid',paid_at=now(),updated_at=now() WHERE id=p_request_id;
 INSERT INTO public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 VALUES(p_request_id,p_actor_user_id,'cash_received',r.payment_status,'paid');
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.admin_record_whatsapp_cash(uuid,uuid,numeric,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_whatsapp_cash(uuid,uuid,numeric,uuid) TO service_role;
