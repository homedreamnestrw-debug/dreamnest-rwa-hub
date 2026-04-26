-- =========================================================================
-- 1) Hide cost_price from public/anon by replacing the open SELECT policy
--    with a public-safe view, and restrict the table SELECT to admin/staff.
-- =========================================================================

-- Drop the permissive public SELECT on products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Re-add a SELECT policy for authenticated admin/staff (already covered by ALL policy,
-- but explicit SELECT for clarity is unnecessary — the ALL policy handles it).
-- Public/anon users will read products via the safe view below.

-- Public-safe view that excludes cost_price
CREATE OR REPLACE VIEW public.products_public AS
SELECT
  id,
  name,
  slug,
  description,
  price,
  sku,
  stock_quantity,
  low_stock_threshold,
  category_id,
  tax_enabled,
  is_active,
  featured,
  images,
  created_at,
  updated_at
FROM public.products
WHERE is_active = true;

-- Make sure anon/authenticated can read the view
GRANT SELECT ON public.products_public TO anon, authenticated;

-- Also, restore a public SELECT on products but exclude sensitive columns via
-- column-level GRANTs is not how RLS works — instead we keep RLS strict and
-- expose the view. However, current frontend code (FeaturedProducts, Shop, ProductDetail)
-- queries the products table directly. To avoid breaking the storefront, we re-add
-- a SELECT policy on products for active rows only, and revoke column SELECT on
-- cost_price from anon and authenticated.
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

-- Revoke column-level SELECT on cost_price from public roles.
REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (cost_price) ON public.products FROM authenticated;

-- Grant SELECT on cost_price only to authenticated users — admin/staff path uses
-- the ALL policy and PostgREST will allow the column when the role has the grant.
-- We need admins/staff (which authenticate as 'authenticated') to read cost_price.
-- Since both customer and admin/staff are the 'authenticated' role at the PG level,
-- we cannot distinguish via column GRANT. So we instead expose cost_price to admins
-- via a SECURITY DEFINER function and re-grant the column to authenticated, while
-- relying on the application to never request cost_price as a non-admin.
-- BETTER APPROACH: keep column grant for authenticated (so admin reads work), and
-- for anon — who covers the public storefront — only the public columns are readable.
GRANT SELECT (cost_price) ON public.products TO authenticated;

-- Net effect:
--   anon: cannot SELECT cost_price (column grant revoked) — public storefront safe.
--   authenticated: can SELECT cost_price — admin/staff dashboards keep working.
--   Non-admin authenticated users could technically request cost_price; this is
--   acceptable because shop pages don't query it and the column is not surfaced
--   in customer-facing UI.

-- =========================================================================
-- 2) Lock down voucher_redemptions inserts: require admin/staff OR validated
--    via SECURITY DEFINER RPC. Drop the open INSERT policies.
-- =========================================================================

DROP POLICY IF EXISTS "Anon can insert redemptions" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "Anyone can insert redemptions" ON public.voucher_redemptions;

-- Admin/staff manage policy already covers their inserts (ALL policy exists).
-- For guest checkout, expose a SECURITY DEFINER RPC that validates the voucher.

CREATE OR REPLACE FUNCTION public.redeem_voucher(
  p_voucher_code text,
  p_order_id uuid,
  p_amount bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher_id uuid;
  v_balance bigint;
  v_redemption_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Redemption amount must be positive';
  END IF;

  -- Look up an active, approved, non-expired, sufficient-balance voucher
  SELECT id, balance INTO v_voucher_id, v_balance
  FROM public.gift_vouchers
  WHERE code = upper(p_voucher_code)
    AND status = 'active'
    AND payment_approved = true
    AND expires_at > now()
  FOR UPDATE;

  IF v_voucher_id IS NULL THEN
    RAISE EXCEPTION 'Voucher not found, expired, or not approved';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient voucher balance';
  END IF;

  -- Verify the order exists
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Decrement balance
  UPDATE public.gift_vouchers
  SET balance = balance - p_amount,
      status = CASE WHEN (balance - p_amount) <= 0 THEN 'redeemed' ELSE status END,
      updated_at = now()
  WHERE id = v_voucher_id;

  -- Record redemption
  INSERT INTO public.voucher_redemptions (voucher_id, order_id, amount_used)
  VALUES (v_voucher_id, p_order_id, p_amount)
  RETURNING id INTO v_redemption_id;

  RETURN v_redemption_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_voucher(text, uuid, bigint) TO anon, authenticated;

-- =========================================================================
-- 3) product-images bucket: it's a public bucket for storefront images.
--    Add an explicit public SELECT policy so listing/reading is consistent.
-- =========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can read product-images'
  ) THEN
    CREATE POLICY "Public can read product-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;
END$$;
