REVOKE EXECUTE ON FUNCTION public.provider_attach_order(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.provider_sync_order(uuid, text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refill_attach_provider(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refill_fail(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.provider_attach_order(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provider_sync_order(uuid, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refill_attach_provider(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refill_fail(uuid, text) TO authenticated, service_role;