
-- 1. Remove public anonymous access to guest orders & order items (prevents PII leak)
DROP POLICY IF EXISTS "Guests can view guest orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view guest order items" ON public.order_items;

-- 2. Lock down get_user_id_by_email to admins only
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN (SELECT id FROM auth.users WHERE email = lower(_email) LIMIT 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
