REVOKE EXECUTE ON FUNCTION public.tg_set_order_location() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_invoice_location() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_protect_assigned_location() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.default_location_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_assigned_location(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.default_location_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_assigned_location(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_location(uuid) TO authenticated, service_role;