
-- Explicit admin-only SELECT on newsletter_subscribers
DROP POLICY IF EXISTS "Admin can read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin can read subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Revoke sensitive columns from public roles
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;
REVOKE SELECT (stock_quantity) ON public.product_variants FROM anon, authenticated;
