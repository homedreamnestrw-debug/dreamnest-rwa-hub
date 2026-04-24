-- 1) Fix gift_vouchers exposure: drop blanket SELECT, rely on validate_voucher RPC + admin/staff policy
DROP POLICY IF EXISTS "Anyone can view vouchers by code" ON public.gift_vouchers;

-- 2) business_settings: add explicit restrictive policy denying public SELECT of sensitive columns.
-- Existing admin ALL policy already restricts access; add a restrictive policy as defense-in-depth.
CREATE POLICY "Deny public select on business_settings"
ON public.business_settings
AS RESTRICTIVE
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Storage: restrict listing on public buckets. Public URLs still work; only API listing is blocked.
-- Drop overly broad SELECT policies on storage.objects for these buckets if any exist.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND pg_get_expr(polqual, polrelid) ILIKE ANY (ARRAY[
        '%product-images%','%business-assets%'
      ])
      AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.polname);
  END LOOP;
END$$;

-- Allow only admin/staff to list/select objects in these public buckets via API
CREATE POLICY "Admin staff can list product-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role)));

CREATE POLICY "Admin staff can list business-assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'business-assets' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role)));
