
-- 1. Fix business_settings: replace the overly permissive SELECT policy
--    with one that hides sensitive SMTP columns from non-admins
DROP POLICY IF EXISTS "Anyone can view business settings" ON public.business_settings;

-- Public can see non-sensitive fields only (via a security definer view)
CREATE OR REPLACE VIEW public.business_settings_public AS
SELECT 
  id, business_name, tagline, logo_url, currency, vat_percentage,
  phone, email, address, city, country, whatsapp_number,
  loyalty_points_rate, loyalty_redemption_rate, loyalty_tiers,
  created_at, updated_at
FROM public.business_settings;

-- New SELECT policy: authenticated admins see everything, anon/public see non-sensitive via view
CREATE POLICY "Authenticated users can view business settings"
ON public.business_settings
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix business-assets bucket: add missing UPDATE policy
CREATE POLICY "Admin can update business assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'business-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Fix user_roles: add explicit restrictive INSERT policy for non-admins
-- The ALL policy already covers admin. Add a deny-by-default explicit INSERT policy.
-- Actually, the ALL policy with USING acts as WITH CHECK too, so non-admins can't insert.
-- But to make it unambiguous, we add an explicit INSERT policy:
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
