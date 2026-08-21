ALTER TABLE public.order_refills
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DROP FUNCTION IF EXISTS public.refill_completed_at(uuid, text, timestamptz);

-- Строгое разрешение заказа: только по его собственному id (uuid или local_id),
-- только для текущего пользователя, только оплаченный/завершённый/с гарантией.
CREATE OR REPLACE FUNCTION public.refill_resolve_order(_user_id uuid, _order_key text)
RETURNS public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders
   WHERE user_id = _user_id
     AND (id::text = _order_key OR meta->>'local_id' = _order_key)
   LIMIT 1;
  RETURN o;
END; $$;

CREATE OR REPLACE FUNCTION public.refill_state(_order_key text, _fallback_completed_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Счётчики считаются строго по этому order_key (этому заказу).
  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills
   WHERE user_id = uid AND order_key = _order_key;

  IF last_at IS NOT NULL THEN next_at := last_at + interval '12 hours'; END IF;

  can := started IS NOT NULL
     AND now() < ends
     AND used < max_refills
     AND (next_at IS NULL OR now() >= next_at);

  RETURN jsonb_build_object(
    'orderId', _order_key,
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
END; $$;

CREATE OR REPLACE FUNCTION public.request_refill(_order_key text, _client_token text, _fallback_completed_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  SELECT id INTO existing FROM public.order_refills
   WHERE user_id = uid AND order_key = _order_key AND client_token = _client_token;
  IF existing IS NOT NULL THEN
    RETURN public.refill_state(_order_key);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || ':' || _order_key, 0));

  o := public.refill_resolve_order(uid, _order_key);
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT COALESCE((o.meta->>'paid')::boolean, false) THEN RAISE EXCEPTION 'Order is not paid'; END IF;
  IF NOT COALESCE((o.meta->>'refillable')::boolean, false) THEN RAISE EXCEPTION 'Refill is not included'; END IF;
  IF o.status <> 'completed' THEN RAISE EXCEPTION 'Order is not completed yet'; END IF;

  BEGIN
    ms := (o.meta->>'completed_at')::bigint;
  EXCEPTION WHEN OTHERS THEN
    ms := NULL;
  END;
  started := CASE WHEN ms IS NOT NULL THEN to_timestamp(ms / 1000.0) ELSE o.updated_at END;
  IF now() >= started + interval '48 hours' THEN RAISE EXCEPTION 'Guarantee expired'; END IF;

  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills
   WHERE user_id = uid AND order_key = _order_key;

  IF used >= 4 THEN RAISE EXCEPTION 'Refill limit reached'; END IF;
  IF last_at IS NOT NULL AND now() < last_at + interval '12 hours' THEN
    RAISE EXCEPTION 'Refill cooldown active';
  END IF;

  INSERT INTO public.order_refills(user_id, order_key, order_id, provider_order_id, client_token, status)
  VALUES (uid, _order_key, o.id, o.meta->>'order_ref', _client_token, 'requested')
  ON CONFLICT (user_id, order_key, client_token) DO NOTHING;

  RETURN public.refill_state(_order_key);
END; $$;

REVOKE ALL ON FUNCTION public.refill_resolve_order(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refill_state(text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_refill(text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refill_state(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_refill(text, text, timestamptz) TO authenticated;