REVOKE ALL ON FUNCTION public.refill_resolve_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refill_resolve_order(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.refill_resolve_order(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refill_resolve_order(uuid, text) TO service_role;