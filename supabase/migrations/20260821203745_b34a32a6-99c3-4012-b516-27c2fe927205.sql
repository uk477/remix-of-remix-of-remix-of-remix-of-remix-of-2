CREATE TABLE IF NOT EXISTS public.order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('admin','automatic_error')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('processing','completed','failed')),
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_refunds TO authenticated;
GRANT ALL ON public.order_refunds TO service_role;

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own refunds" ON public.order_refunds;
CREATE POLICY "Users read own refunds" ON public.order_refunds
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS order_refunds_set_updated_at ON public.order_refunds;
CREATE TRIGGER order_refunds_set_updated_at
  BEFORE UPDATE ON public.order_refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Единая функция возврата: используется и админом, и автоматикой при ошибке.
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

  -- Идемпотентность: возврат по заказу возможен ровно один раз.
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

  SELECT COALESCE(balance, 0) INTO cur FROM public.profiles WHERE id = o.user_id FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
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

-- Ручной возврат из админ-панели по конкретному заказу.
CREATE OR REPLACE FUNCTION public.admin_refund_order(_order_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  res jsonb;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  res := public.refund_order(_order_id, 'admin', caller, _reason);

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (caller, 'order_refund', 'order', _order_id::text, res);

  RETURN res;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_refund_order(uuid, text) TO authenticated;

-- Состояние возврата для клиента (только свой заказ или админ).
CREATE OR REPLACE FUNCTION public.order_refund_state(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  r public.order_refunds;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> caller AND NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO r FROM public.order_refunds WHERE order_id = _order_id;

  RETURN jsonb_build_object(
    'orderId', o.id,
    'orderStatus', o.status::text,
    'refunded', r.id IS NOT NULL,
    'refundId', r.id,
    'refundSource', r.source,
    'refundStatus', r.status,
    'amount', r.amount_usd,
    'completedAt', r.completed_at,
    'serverNow', now()
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.order_refund_state(uuid) TO authenticated;

-- Автоматический возврат: заказ завершился ошибкой → сразу запускаем возврат.
CREATE OR REPLACE FUNCTION public.orders_auto_refund_on_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'failed'::public.order_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND COALESCE(NEW.amount_usd, 0) > 0
     AND NOT EXISTS (SELECT 1 FROM public.order_refunds WHERE order_id = NEW.id) THEN
    PERFORM public.refund_order(NEW.id, 'automatic_error', NULL, 'order failed');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_auto_refund_on_error ON public.orders;
CREATE TRIGGER orders_auto_refund_on_error
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_auto_refund_on_error();