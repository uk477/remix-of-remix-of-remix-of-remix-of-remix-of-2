CREATE TABLE public.order_refills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_key text NOT NULL,
  client_token text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_key, client_token)
);

CREATE INDEX order_refills_user_order_idx ON public.order_refills(user_id, order_key, requested_at DESC);

GRANT SELECT ON public.order_refills TO authenticated;
GRANT ALL ON public.order_refills TO service_role;

ALTER TABLE public.order_refills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own refills" ON public.order_refills
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins read all refills" ON public.order_refills
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.refill_completed_at(_user_id uuid, _order_key text, _fallback timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders;
  ms bigint;
BEGIN
  SELECT * INTO o FROM public.orders
   WHERE user_id = _user_id
     AND (id::text = _order_key OR meta->>'local_id' = _order_key)
   ORDER BY created_at DESC LIMIT 1;

  IF o.id IS NULL THEN
    RETURN _fallback;
  END IF;

  IF o.status <> 'completed' THEN
    RETURN NULL;
  END IF;

  BEGIN
    ms := (o.meta->>'completed_at')::bigint;
  EXCEPTION WHEN OTHERS THEN
    ms := NULL;
  END;

  IF ms IS NOT NULL THEN
    RETURN to_timestamp(ms / 1000.0);
  END IF;

  RETURN o.updated_at;
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
  cooldown interval := interval '12 hours';
  window_len interval := interval '48 hours';
  started timestamptz;
  ends timestamptz;
  used int := 0;
  last_at timestamptz;
  next_at timestamptz;
  can boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;

  started := public.refill_completed_at(uid, _order_key, _fallback_completed_at);
  IF started IS NOT NULL THEN ends := started + window_len; END IF;

  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills WHERE user_id = uid AND order_key = _order_key;

  IF last_at IS NOT NULL THEN next_at := last_at + cooldown; END IF;

  can := started IS NOT NULL
     AND now() < ends
     AND used < max_refills
     AND (next_at IS NULL OR now() >= next_at);

  RETURN jsonb_build_object(
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
  started timestamptz;
  ends timestamptz;
  used int := 0;
  last_at timestamptz;
  existing uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _order_key IS NULL OR length(btrim(_order_key)) = 0 THEN RAISE EXCEPTION 'order_key required'; END IF;
  IF _client_token IS NULL OR length(btrim(_client_token)) = 0 THEN RAISE EXCEPTION 'client_token required'; END IF;

  -- Idempotency: the same token never creates a second refill.
  SELECT id INTO existing FROM public.order_refills
   WHERE user_id = uid AND order_key = _order_key AND client_token = _client_token;
  IF existing IS NOT NULL THEN
    RETURN public.refill_state(_order_key, _fallback_completed_at);
  END IF;

  -- Serialize concurrent requests for the same user+order.
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || ':' || _order_key, 0));

  started := public.refill_completed_at(uid, _order_key, _fallback_completed_at);
  IF started IS NULL THEN RAISE EXCEPTION 'Order is not completed yet'; END IF;
  ends := started + interval '48 hours';
  IF now() >= ends THEN RAISE EXCEPTION 'Guarantee expired'; END IF;

  SELECT count(*), max(requested_at) INTO used, last_at
    FROM public.order_refills WHERE user_id = uid AND order_key = _order_key;

  IF used >= 4 THEN RAISE EXCEPTION 'Refill limit reached'; END IF;
  IF last_at IS NOT NULL AND now() < last_at + interval '12 hours' THEN
    RAISE EXCEPTION 'Refill cooldown active';
  END IF;

  INSERT INTO public.order_refills(user_id, order_key, client_token)
  VALUES (uid, _order_key, _client_token)
  ON CONFLICT (user_id, order_key, client_token) DO NOTHING;

  RETURN public.refill_state(_order_key, _fallback_completed_at);
END; $$;