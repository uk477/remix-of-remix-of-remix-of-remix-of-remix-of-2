CREATE OR REPLACE FUNCTION public.admin_set_order_status(_order_id uuid, _status text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  prev text;
  new_meta jsonb;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _status IS NULL OR _status NOT IN ('pending','in_progress','waiting','completed','declined','refunded','failed','refilling') THEN
    RAISE EXCEPTION 'Unknown status';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  prev := o.status::text;
  new_meta := COALESCE(o.meta, '{}'::jsonb);

  IF _status = 'completed' AND NULLIF(new_meta->>'completed_at', '') IS NULL THEN
    new_meta := new_meta || jsonb_build_object('completed_at', (extract(epoch from clock_timestamp()) * 1000)::bigint);
  END IF;

  UPDATE public.orders
     SET status = _status::public.order_status,
         meta = new_meta,
         updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'order_status_override', 'order', _order_id::text,
          jsonb_build_object('from', prev, 'to', o.status::text, 'completed_at', o.meta->>'completed_at'));

  RETURN o;
END;
$function$;

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
  can_request boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;

  o := public.refill_resolve_order(uid, _order_key);

  IF o.id IS NOT NULL THEN
    eligible := COALESCE((o.meta->>'refillable')::boolean, false)
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
     WHERE order_id = o.id AND user_id = o.user_id AND source = 'customer';
  END IF;

  IF last_at IS NOT NULL THEN next_at := last_at + interval '12 hours'; END IF;

  can_request := o.id IS NOT NULL
     AND o.user_id = uid
     AND o.status = 'completed'::public.order_status
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
  IF o.user_id <> uid THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT id INTO existing FROM public.order_refills
   WHERE user_id = uid AND order_id = o.id AND client_token = _client_token;
  IF existing IS NOT NULL THEN RETURN public.refill_state(o.id::text); END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || ':' || o.id::text, 0));
  SELECT * INTO o FROM public.orders WHERE id = o.id AND user_id = uid FOR UPDATE;

  IF NOT COALESCE((o.meta->>'paid')::boolean, false) THEN RAISE EXCEPTION 'Order is not paid'; END IF;
  IF NOT COALESCE((o.meta->>'refillable')::boolean, false) THEN RAISE EXCEPTION 'Refill is not included'; END IF;
  IF o.status <> 'completed'::public.order_status THEN RAISE EXCEPTION 'Order is not completed yet'; END IF;

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
   WHERE user_id = uid AND order_id = o.id AND source = 'customer';
  IF used >= 4 THEN RAISE EXCEPTION 'Refill limit reached'; END IF;
  IF last_at IS NOT NULL AND now() < last_at + interval '12 hours' THEN
    RAISE EXCEPTION 'Refill cooldown active';
  END IF;

  INSERT INTO public.order_refills(user_id, order_key, order_id, provider_order_id, client_token, status, source, prev_status, refill_number)
  VALUES (uid, o.id::text, o.id, o.meta->>'order_ref', _client_token, 'requested', 'customer', o.status::text, used + 1)
  ON CONFLICT (user_id, order_key, client_token) DO NOTHING;

  UPDATE public.orders
     SET status = 'refilling'::public.order_status,
         updated_at = now()
   WHERE id = o.id;

  RETURN public.refill_state(o.id::text);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_force_refill(_order_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  n int;
  rec public.order_refills;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT count(*) + 1 INTO n FROM public.order_refills WHERE order_id = _order_id;
  INSERT INTO public.order_refills(
    user_id, order_key, order_id, provider_order_id, client_token,
    status, source, admin_id, prev_status, refill_number
  ) VALUES (
    o.user_id, o.id::text, o.id, o.meta->>'order_ref', 'admin:' || gen_random_uuid()::text,
    'requested', 'admin', caller, o.status::text, n
  ) RETURNING * INTO rec;

  UPDATE public.orders
     SET status = 'refilling'::public.order_status,
         updated_at = now()
   WHERE id = o.id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'order_force_refill', 'order', _order_id::text,
          jsonb_build_object('refill_id', rec.id, 'refill_number', n, 'prev_status', o.status::text, 'note', _note));

  RETURN jsonb_build_object(
    'refillId', rec.id,
    'orderId', o.id,
    'refillNumber', n,
    'prevStatus', o.status::text,
    'status', 'refilling',
    'requestedAt', rec.requested_at,
    'serverNow', now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_order_refills(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  hist jsonb;
  cust_used int;
  last_at timestamptz;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'requestedAt' DESC), '[]'::jsonb) INTO hist
  FROM (
    SELECT jsonb_build_object(
      'refillId', r.id, 'orderId', r.order_id, 'userId', r.user_id,
      'adminId', r.admin_id, 'source', r.source, 'status', r.status,
      'prevStatus', r.prev_status, 'refillNumber', r.refill_number,
      'providerOrderId', r.provider_order_id, 'requestedAt', r.requested_at,
      'completedAt', r.completed_at
    ) AS x
    FROM public.order_refills r
    WHERE r.order_id = _order_id
  ) s;

  SELECT count(*), max(requested_at) INTO cust_used, last_at
    FROM public.order_refills
   WHERE order_id = _order_id AND source = 'customer';

  RETURN jsonb_build_object(
    'history', hist,
    'customerUsed', cust_used,
    'customerMax', 4,
    'customerLastRefillAt', last_at,
    'customerNextRefillAt', CASE WHEN last_at IS NULL THEN NULL ELSE last_at + interval '12 hours' END,
    'serverNow', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_order_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refill_state(text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_refill(text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_force_refill(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_order_refills(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refill_state(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_refill(text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_refill(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_order_refills(uuid) TO authenticated;