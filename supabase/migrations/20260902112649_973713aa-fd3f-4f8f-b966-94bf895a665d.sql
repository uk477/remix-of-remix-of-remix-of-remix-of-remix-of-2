CREATE OR REPLACE FUNCTION public.refill_state(_order_key text, _fallback_completed_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  max_refills int := 4;
  o public.orders;
  ms bigint;
  started timestamptz;
  ends timestamptz;
  used int := 0;
  last_at timestamptz;
  next_at timestamptz;
  eligible boolean := false;
  caller_allowed boolean := false;
  can_request boolean := false;
  refunded boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);

  IF o.id IS NOT NULL THEN
    caller_allowed := o.user_id = uid OR public.has_role(uid, 'admin'::public.app_role);
    refunded := o.status = 'refunded'::public.order_status
      OR EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id);
    eligible := NOT refunded
      AND COALESCE((o.meta->>'refillable')::boolean, false)
      AND COALESCE((o.meta->>'paid')::boolean, false);

    BEGIN
      ms := NULLIF(o.meta->>'completed_at', '')::bigint;
    EXCEPTION WHEN OTHERS THEN
      ms := NULL;
    END;
    IF ms IS NOT NULL THEN
      started := to_timestamp(ms / 1000.0);
      ends := started + interval '48 hours';
    END IF;

    SELECT count(*), max(requested_at) INTO used, last_at
      FROM public.order_refills
     WHERE order_id = o.id
       AND source = 'customer'
       AND status <> 'failed';
  END IF;

  IF last_at IS NOT NULL THEN next_at := last_at + interval '12 hours'; END IF;

  can_request := o.id IS NOT NULL
     AND caller_allowed
     AND NOT refunded
     AND o.status IN ('completed'::public.order_status, 'refilling'::public.order_status)
     AND eligible
     AND started IS NOT NULL
     AND now() < ends
     AND used < max_refills
     AND (next_at IS NULL OR now() >= next_at);

  RETURN jsonb_build_object(
    'orderId', COALESCE(o.id::text, _order_key),
    'dbOrderId', o.id,
    'orderStatus', CASE WHEN o.id IS NULL THEN NULL ELSE o.status::text END,
    'paid', CASE WHEN o.id IS NULL THEN false ELSE COALESCE((o.meta->>'paid')::boolean, false) END,
    'refillable', CASE WHEN o.id IS NULL THEN false ELSE COALESCE((o.meta->>'refillable')::boolean, false) END,
    'eligible', eligible,
    'guaranteeStartedAt', started,
    'guaranteeEndsAt', ends,
    'usedRefills', used,
    'maxRefills', max_refills,
    'lastRefillAt', last_at,
    'nextRefillAt', next_at,
    'canRequest', can_request,
    'canRequestRefill', can_request,
    'serverNow', now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_refill(_order_key text, _client_token text, _fallback_completed_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  ms bigint;
  started timestamptz;
  used int := 0;
  last_at timestamptz;
  existing uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;
  IF _client_token IS NULL OR length(btrim(_client_token)) = 0 THEN RAISE EXCEPTION 'client_token required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF o.status = 'refunded'::public.order_status
     OR EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id) THEN
    RAISE EXCEPTION 'Refunded orders cannot be refilled';
  END IF;

  SELECT id INTO existing FROM public.order_refills
   WHERE user_id = o.user_id AND order_id = o.id AND client_token = _client_token;
  IF existing IS NOT NULL THEN RETURN public.refill_state(o.id::text); END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(o.user_id::text || ':' || o.id::text, 0));
  SELECT * INTO o FROM public.orders WHERE id = o.id FOR UPDATE;

  IF o.status = 'refunded'::public.order_status
     OR EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id) THEN
    RAISE EXCEPTION 'Refunded orders cannot be refilled';
  END IF;
  IF NOT COALESCE((o.meta->>'paid')::boolean, false) THEN RAISE EXCEPTION 'Order is not paid'; END IF;
  IF NOT COALESCE((o.meta->>'refillable')::boolean, false) THEN RAISE EXCEPTION 'Refill is not included'; END IF;
  IF o.status NOT IN ('completed'::public.order_status, 'refilling'::public.order_status) THEN RAISE EXCEPTION 'Order is not completed yet'; END IF;

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
   WHERE order_id = o.id AND source = 'customer' AND status <> 'failed';
  IF used >= 4 THEN RAISE EXCEPTION 'Refill limit reached'; END IF;
  IF last_at IS NOT NULL AND now() < last_at + interval '12 hours' THEN
    RAISE EXCEPTION 'Refill cooldown active';
  END IF;

  INSERT INTO public.order_refills(user_id, order_key, order_id, provider_order_id, client_token, status, source, prev_status, refill_number)
  VALUES (o.user_id, o.id::text, o.id, o.meta->>'order_ref', _client_token, 'requested', 'customer', o.status::text, used + 1)
  ON CONFLICT (user_id, order_key, client_token) DO NOTHING;

  UPDATE public.orders
     SET status = 'refilling'::public.order_status, updated_at = now()
   WHERE id = o.id
     AND status IN ('completed'::public.order_status, 'refilling'::public.order_status)
     AND NOT EXISTS (SELECT 1 FROM public.order_refunds r WHERE r.order_id = o.id);

  RETURN public.refill_state(o.id::text);
END;
$function$;

REVOKE ALL ON FUNCTION public.refill_state(text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_refill(text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refill_state(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_refill(text, text, timestamptz) TO authenticated;