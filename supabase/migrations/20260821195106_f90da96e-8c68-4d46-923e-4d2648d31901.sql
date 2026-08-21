CREATE OR REPLACE FUNCTION public.refill_state(_order_key text, _fallback_completed_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
  can boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);

  IF o.id IS NOT NULL THEN
    eligible := COALESCE((o.meta->>'refillable')::boolean, false)
            AND COALESCE((o.meta->>'paid')::boolean, false);

    IF eligible AND o.status = 'completed' THEN
      BEGIN
        ms := (o.meta->>'completed_at')::bigint;
      EXCEPTION WHEN OTHERS THEN
        ms := NULL;
      END;
      started := CASE WHEN ms IS NOT NULL THEN to_timestamp(ms / 1000.0) ELSE o.updated_at END;
      ends := started + interval '48 hours';
    END IF;
  END IF;

  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills
   WHERE user_id = uid AND order_key = _order_key AND source = 'customer';

  IF last_at IS NOT NULL THEN next_at := last_at + interval '12 hours'; END IF;

  can := started IS NOT NULL
     AND now() < ends
     AND used < max_refills
     AND (next_at IS NULL OR now() >= next_at);

  RETURN jsonb_build_object(
    'orderId', _order_key,
    'dbOrderId', o.id,
    'eligible', eligible,
    'guaranteeStartedAt', started,
    'guaranteeEndsAt', ends,
    'usedRefills', used,
    'maxRefills', max_refills,
    'lastRefillAt', last_at,
    'nextRefillAt', next_at,
    'canRequest', can,
    'serverNow', now()
  );
END; $function$;