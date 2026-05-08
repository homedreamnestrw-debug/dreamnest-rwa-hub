-- Revoke cost_price SELECT from authenticated so non-admin signed-in customers cannot read it
REVOKE SELECT (cost_price) ON public.products FROM authenticated;

-- Admin/staff-only view that exposes cost_price (filtered server-side)
CREATE OR REPLACE VIEW public.admin_products_with_costs AS
SELECT *
FROM public.products
WHERE public.has_role(auth.uid(), 'admin')
   OR public.has_role(auth.uid(), 'staff');

-- Ensure the view runs with the definer's privileges (so cost_price is readable inside the view)
ALTER VIEW public.admin_products_with_costs SET (security_invoker = off);

-- Grant access to the view (RLS via the WHERE clause + has_role check)
GRANT SELECT ON public.admin_products_with_costs TO authenticated;
REVOKE SELECT ON public.admin_products_with_costs FROM anon;