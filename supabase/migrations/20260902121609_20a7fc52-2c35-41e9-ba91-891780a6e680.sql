CREATE OR REPLACE FUNCTION public.request_refill(_order_key text, _client_token text, _fallback_completed_at timestamp with time zone DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  existing uuid;
  existing_status text;
  rec public.order_refills;
  ms bigint;
  started timestamptz;
  used int := 0;
  last_at timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;
  IF _client_token IS NULL OR length(btrim(_client_token)) = 0 THEN RAISE EXCEPTION 'client_token required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF o.status = 'refunded'::public.order_status
     OR EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id) THEN
    RAISE EXCEPTION 'Refunded orders cannot be refilled';
  END IF;

  SELECT id, status INTO existing, existing_status
    FROM public.order_refills
   WHERE user_id = o.user_id
     AND order_id = o.id
     AND client_token = _client_token;
  IF existing IS NOT NULL THEN
    RETURN public.refill_state(o.id::text) || jsonb_build_object('refillId', existing, 'refillStatus', existing_status);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(o.user_id::text || ':' || o.id::text, 0));
  SELECT * INTO o FROM public.orders WHERE id = o.id FOR UPDATE;

  IF o.status = 'refunded'::public.order_status
     OR EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id) THEN
    RAISE EXCEPTION 'Refunded orders cannot be refilled';
  END IF;
  IF NOT COALESCE((o.meta->>'paid')::boolean, false) THEN RAISE EXCEPTION 'Order is not paid'; END IF;
  IF NOT COALESCE((o.meta->>'refillable')::boolean, false) THEN RAISE EXCEPTION 'Refill is not included'; END IF;
  IF o.status NOT IN ('completed'::public.order_status, 'refilling'::public.order_status) THEN
    RAISE EXCEPTION 'Order is not completed yet';
  END IF;

  BEGIN
    ms := NULLIF(o.meta->>'completed_at', '')::bigint;
  EXCEPTION WHEN OTHERS THEN
    ms := NULL;
  END;
  IF ms IS NULL THEN RAISE EXCEPTION 'Order completion time is missing'; END IF;
  started := to_timestamp(ms / 1000.0);
  IF now() >= started + interval '48 hours' THEN RAISE EXCEPTION 'Guarantee expired'; END IF;

  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills
   WHERE order_id = o.id
     AND source = 'customer'
     AND status <> 'failed';
  IF used >= 4 THEN RAISE EXCEPTION 'Refill limit reached'; END IF;
  IF last_at IS NOT NULL AND now() < last_at + interval '12 hours' THEN
    RAISE EXCEPTION 'Refill cooldown active';
  END IF;

  INSERT INTO public.order_refills(
    user_id, order_key, order_id, provider_order_id, client_token,
    status, source, prev_status, refill_number
  ) VALUES (
    o.user_id, o.id::text, o.id, NULL, _client_token,
    'requested', 'customer', o.status::text, used + 1
  )
  RETURNING * INTO rec;

  UPDATE public.orders
     SET status = 'refilling'::public.order_status, updated_at = now()
   WHERE id = o.id
     AND status IN ('completed'::public.order_status, 'refilling'::public.order_status)
     AND NOT EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id);

  RETURN public.refill_state(o.id::text)
    || jsonb_build_object('refillId', rec.id, 'refillStatus', rec.status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refill_claim_provider(_refill_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  r public.order_refills;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO r
    FROM public.order_refills
   WHERE id = _refill_id
   FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Refill not found'; END IF;
  IF r.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF r.status <> 'requested' THEN
    RETURN jsonb_build_object(
      'refillId', r.id,
      'claimed', false,
      'status', r.status,
      'providerOrderId', r.provider_order_id
    );
  END IF;

  UPDATE public.order_refills
     SET status = 'starting'
   WHERE id = r.id;

  RETURN jsonb_build_object(
    'refillId', r.id,
    'claimed', true,
    'status', 'starting',
    'providerOrderId', NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.refill_attach_provider(_refill_id uuid, _provider_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  r public.order_refills;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _provider_order_id IS NULL OR length(btrim(_provider_order_id)) = 0 THEN
    RAISE EXCEPTION 'provider_order_id required';
  END IF;

  SELECT * INTO r FROM public.order_refills WHERE id = _refill_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Refill not found'; END IF;
  IF r.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF r.provider_order_id IS NOT NULL THEN
    IF r.provider_order_id <> _provider_order_id THEN
      RAISE EXCEPTION 'Refill provider order already attached';
    END IF;
    RETURN jsonb_build_object(
      'refillId', r.id,
      'providerOrderId', r.provider_order_id,
      'status', r.status,
      'serverNow', now()
    );
  END IF;

  UPDATE public.order_refills
     SET provider_order_id = _provider_order_id,
         status = 'in_progress'
   WHERE id = r.id;

  RETURN jsonb_build_object(
    'refillId', r.id,
    'providerOrderId', _provider_order_id,
    'status', 'in_progress',
    'serverNow', now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.refill_fail(_refill_id uuid, _error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF r.status IN ('completed', 'success', 'done') THEN
    RETURN jsonb_build_object('refillId', r.id, 'status', r.status, 'serverNow', now());
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
       AND status = 'refilling'::public.order_status
       AND NOT EXISTS (SELECT 1 FROM public.order_refunds rfd WHERE rfd.order_id = r.order_id);
  END IF;

  RETURN jsonb_build_object('refillId', r.id, 'status', 'failed', 'error', _error, 'serverNow', now());
END;
$function$;

REVOKE ALL ON FUNCTION public.refill_claim_provider(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refill_attach_provider(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refill_fail(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refill_claim_provider(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refill_attach_provider(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refill_fail(uuid, text) TO authenticated, service_role;