-- 1) Триггер: успешный рефилл -> заказ снова "completed"
CREATE OR REPLACE FUNCTION public.refill_complete_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed','success','done')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;

    IF NEW.order_id IS NOT NULL THEN
      UPDATE public.orders o
         SET status = 'completed'::public.order_status,
             -- исходное время завершения не перезаписываем
             meta = CASE
               WHEN COALESCE(o.meta->>'completed_at','') = ''
                 THEN COALESCE(o.meta,'{}'::jsonb)
                      || jsonb_build_object('completed_at', (extract(epoch from now()) * 1000)::bigint)
               ELSE o.meta
             END,
             updated_at = now()
       WHERE o.id = NEW.order_id
         AND o.status IN ('refilling'::public.order_status, 'in_progress'::public.order_status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_refills_complete_order ON public.order_refills;
CREATE TRIGGER order_refills_complete_order
BEFORE INSERT OR UPDATE OF status ON public.order_refills
FOR EACH ROW EXECUTE FUNCTION public.refill_complete_order();

-- 2) RPC: пометить рефилл выполненным (владелец заказа или админ)
CREATE OR REPLACE FUNCTION public.complete_refill(_order_key text, _refill_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  target uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  o := public.refill_resolve_order(uid, _order_key);
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> uid AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO target
    FROM public.order_refills
   WHERE order_id = o.id
     AND (_refill_id IS NULL OR id = _refill_id)
     AND status NOT IN ('completed','success','done')
   ORDER BY requested_at DESC
   LIMIT 1;

  IF target IS NOT NULL THEN
    UPDATE public.order_refills
       SET status = 'completed', completed_at = now()
     WHERE id = target;
  ELSE
    -- рефиллов в работе нет — просто закрываем заказ
    UPDATE public.orders
       SET status = 'completed'::public.order_status, updated_at = now()
     WHERE id = o.id AND status = 'refilling'::public.order_status;
  END IF;

  RETURN public.refill_state(o.id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_refill(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_refill(text, uuid) TO authenticated;