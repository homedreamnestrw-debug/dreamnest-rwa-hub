-- 1) Properly hide products.cost_price from anon/authenticated
-- Table-level SELECT overrides column REVOKE, so revoke table SELECT then re-grant per-column.
REVOKE SELECT ON public.products FROM anon, authenticated;

GRANT SELECT (
  id, name, slug, description, price, sku, stock_quantity, low_stock_threshold,
  category_id, images, tax_enabled, is_active, featured, created_at, updated_at,
  variant_attributes
) ON public.products TO anon, authenticated;

-- Admin/staff continue to have full access through RLS using service_role / postgres
GRANT SELECT ON public.products TO service_role;

-- 2) Tighten gift_vouchers public INSERT to prevent fake/approved vouchers
DROP POLICY IF EXISTS "Anyone can purchase vouchers" ON public.gift_vouchers;

CREATE POLICY "Anyone can purchase vouchers"
ON public.gift_vouchers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND payment_approved = false
  AND payment_status = 'unpaid'
  AND balance = 0
  AND payment_approved_by IS NULL
  AND payment_approved_at IS NULL
);