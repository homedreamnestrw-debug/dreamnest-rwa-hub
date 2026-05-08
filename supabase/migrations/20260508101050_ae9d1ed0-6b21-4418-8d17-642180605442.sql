DROP VIEW IF EXISTS public.admin_products_with_costs;

CREATE OR REPLACE FUNCTION public.get_admin_products_with_costs()
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.products;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_products_with_costs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_products_with_costs() TO authenticated;