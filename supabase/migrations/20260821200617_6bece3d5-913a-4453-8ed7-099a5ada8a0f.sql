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
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'requestedAt' DESC), '[]'::jsonb) INTO hist
  FROM (
    SELECT jsonb_build_object(
      'refillId', r.id,
      'orderId', r.order_key,
      'userId', r.user_id,
      'adminId', r.admin_id,
      'source', r.source,
      'status', r.status,
      'prevStatus', r.prev_status,
      'refillNumber', r.refill_number,
      'providerOrderId', r.provider_order_id,
      'requestedAt', r.requested_at,
      'completedAt', r.completed_at
    ) AS x
    FROM public.order_refills r
    WHERE r.order_id = _order_id OR r.order_key = _order_id::text
  ) s;

  SELECT count(*), max(requested_at) INTO cust_used, last_at
    FROM public.order_refills
   WHERE (order_id = _order_id OR order_key = _order_id::text) AND source = 'customer';

  RETURN jsonb_build_object(
    'history', hist,
    'customerUsed', cust_used,
    'customerMax', 4,
    'customerLastRefillAt', last_at,
    'customerNextRefillAt', CASE WHEN last_at IS NULL THEN NULL ELSE last_at + interval '12 hours' END,
    'serverNow', now()
  );
END; $function$;