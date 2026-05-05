-- Restore SELECT on products for authenticated users (admin/staff need cost_price; RLS still applies).
-- Keep anon restricted to non-sensitive columns only.
GRANT SELECT ON public.products TO authenticated;

-- Also ensure variant + stock tables are readable by authenticated (in case prior migration affected them).
GRANT SELECT ON public.product_variants TO authenticated, anon;
GRANT SELECT ON public.product_stock TO authenticated;
GRANT SELECT ON public.variant_stock TO authenticated;
GRANT SELECT ON public.categories TO authenticated, anon;