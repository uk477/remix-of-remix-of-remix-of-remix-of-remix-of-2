CREATE OR REPLACE FUNCTION public.refund_order(_order_id uuid, _source text, _actor uuid DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders;
  existing public.order_refunds;
  cur numeric;
  new_bal numeric;
  amt numeric;
  rec public.order_refunds;
BEGIN
  IF _source IS NULL OR _source NOT IN ('admin','automatic_error') THEN
    RAISE EXCEPTION 'Unknown refund source';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT * INTO existing FROM public.order_refunds WHERE order_id = _order_id;
  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'refundId', existing.id,
      'orderId', _order_id,
      'userId', existing.user_id,
      'amount', existing.amount_usd,
      'refundSource', existing.source,
      'status', existing.status,
      'alreadyRefunded', true,
      'orderStatus', o.status::text,
      'serverNow', now()
    );
  END IF;

  amt := COALESCE(o.amount_usd, 0);
  IF amt <= 0 THEN
    RAISE EXCEPTION 'Order is not paid';
  END IF;
  IF o.user_id IS NULL THEN
    RAISE EXCEPTION 'Order has no owner';
  END IF;

  PERFORM set_config('app.allow_balance_write', 'on', true);

  -- Профиль может отсутствовать (старые/тестовые пользователи) — создаём его,
  -- иначе автоматический возврат срывал бы смену статуса заказа.
  INSERT INTO public.profiles(id, balance)
  VALUES (o.user_id, 0)
  ON CONFLICT (id) DO NOTHING;

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = o.user_id FOR UPDATE;
  cur := COALESCE(cur, 0);
  new_bal := cur + amt;

  UPDATE public.profiles SET balance = new_bal, updated_at = now() WHERE id = o.user_id;

  INSERT INTO public.balance_transactions(user_id, delta, balance_after, kind, reason, ref_id, created_by)
  VALUES (o.user_id, amt, new_bal, 'refund', COALESCE(_reason, 'refund: ' || _source), o.id, _actor);

  INSERT INTO public.order_refunds(order_id, user_id, amount_usd, source, status, reason, created_by, completed_at)
  VALUES (o.id, o.user_id, amt, _source, 'completed', _reason, _actor, now())
  RETURNING * INTO rec;

  UPDATE public.orders
     SET status = 'refunded'::public.order_status,
         meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('refund_source', _source),
         updated_at = now()
   WHERE id = o.id;

  RETURN jsonb_build_object(
    'refundId', rec.id,
    'orderId', o.id,
    'userId', o.user_id,
    'amount', amt,
    'refundSource', _source,
    'status', rec.status,
    'alreadyRefunded', false,
    'orderStatus', 'refunded',
    'serverNow', now()
  );
END; $$;

REVOKE ALL ON FUNCTION public.refund_order(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;