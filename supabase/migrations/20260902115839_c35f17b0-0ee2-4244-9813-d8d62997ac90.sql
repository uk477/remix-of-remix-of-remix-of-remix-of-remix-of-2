-- Привязка провайдерского заказа к нашему заказу
CREATE OR REPLACE FUNCTION public.provider_attach_order(_order_id uuid, _provider text, _provider_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.orders
     SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
           'provider', _provider,
           'provider_order_id', _provider_order_id,
           'order_ref', _provider_order_id
         ),
         status = CASE WHEN status = 'pending'::public.order_status
                       THEN 'in_progress'::public.order_status ELSE status END,
         updated_at = now()
   WHERE id = o.id
  RETURNING * INTO o;

  RETURN jsonb_build_object('orderId', o.id, 'status', o.status::text, 'serverNow', now());
END;
$$;

-- Синхронизация статуса заказа по данным поставщика
CREATE OR REPLACE FUNCTION public.provider_sync_order(_order_id uuid, _status text, _received integer DEFAULT NULL, _start_count integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  new_meta jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _status IS NULL OR _status NOT IN ('pending','in_progress','waiting','completed','failed') THEN
    RAISE EXCEPTION 'Unknown status';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Терминальные состояния и активный рефилл не перетираем данными поставщика
  IF o.status IN ('refunded'::public.order_status, 'declined'::public.order_status, 'refilling'::public.order_status) THEN
    RETURN jsonb_build_object('orderId', o.id, 'status', o.status::text, 'changed', false, 'serverNow', now());
  END IF;

  new_meta := COALESCE(o.meta, '{}'::jsonb);
  IF _received IS NOT NULL THEN
    new_meta := new_meta || jsonb_build_object('provider_received', _received);
  END IF;
  IF _start_count IS NOT NULL THEN
    new_meta := new_meta || jsonb_build_object('provider_start_count', _start_count);
  END IF;
  IF _status = 'completed' AND NULLIF(new_meta->>'completed_at', '') IS NULL THEN
    new_meta := new_meta || jsonb_build_object('completed_at', (extract(epoch from clock_timestamp()) * 1000)::bigint);
  END IF;

  UPDATE public.orders
     SET status = _status::public.order_status,
         meta = new_meta,
         updated_at = now()
   WHERE id = o.id
  RETURNING * INTO o;

  RETURN jsonb_build_object('orderId', o.id, 'status', o.status::text, 'changed', true, 'serverNow', now());
END;
$$;

-- Привязка компенсирующего заказа поставщика к записи рефилла
CREATE OR REPLACE FUNCTION public.refill_attach_provider(_refill_id uuid, _provider_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  r public.order_refills;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO r FROM public.order_refills WHERE id = _refill_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Refill not found'; END IF;
  IF r.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.order_refills
     SET provider_order_id = _provider_order_id,
         status = 'in_progress'
   WHERE id = r.id;

  RETURN jsonb_build_object('refillId', r.id, 'providerOrderId', _provider_order_id, 'serverNow', now());
END;
$$;

-- Неудачный рефилл: помечаем failed и возвращаем заказ в прежний статус
CREATE OR REPLACE FUNCTION public.refill_fail(_refill_id uuid, _error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  r public.order_refills;
  prev text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO r FROM public.order_refills WHERE id = _refill_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Refill not found'; END IF;
  IF r.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.order_refills
     SET status = 'failed'
   WHERE id = r.id;

  prev := COALESCE(NULLIF(r.prev_status, ''), 'completed');
  IF prev NOT IN ('pending','in_progress','waiting','completed','declined','refunded','failed','refilling') THEN
    prev := 'completed';
  END IF;

  IF r.order_id IS NOT NULL THEN
    UPDATE public.orders
       SET status = prev::public.order_status,
           updated_at = now()
     WHERE id = r.order_id
       AND status = 'refilling'::public.order_status;
  END IF;

  RETURN jsonb_build_object('refillId', r.id, 'status', 'failed', 'error', _error, 'serverNow', now());
END;
$$;