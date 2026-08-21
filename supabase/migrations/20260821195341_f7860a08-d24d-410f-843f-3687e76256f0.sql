CREATE OR REPLACE FUNCTION public.refill_resolve_order(_user_id uuid, _order_key text)
RETURNS public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o
  FROM public.orders
  WHERE (id::text = _order_key OR meta->>'local_id' = _order_key)
    AND (
      user_id = _user_id
      OR public.has_role(_user_id, 'admin'::public.app_role)
    )
  LIMIT 1;

  RETURN o;
END;
$$;