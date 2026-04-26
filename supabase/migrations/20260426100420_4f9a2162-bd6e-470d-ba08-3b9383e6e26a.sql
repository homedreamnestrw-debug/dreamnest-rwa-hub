-- 1. Recreate products_public view with SECURITY INVOKER (Postgres 15+)
ALTER VIEW public.products_public SET (security_invoker = true);

-- 2. Hide cost_price from anonymous (public/storefront) users via column-level privileges.
-- Admin/staff are authenticated so they keep full access via existing RLS policies.
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, name, slug, description, price, sku, stock_quantity,
  low_stock_threshold, category_id, tax_enabled, is_active,
  featured, images, created_at, updated_at
) ON public.products TO anon;

-- Authenticated keeps full SELECT (governed by RLS policies)
GRANT SELECT ON public.products TO authenticated;