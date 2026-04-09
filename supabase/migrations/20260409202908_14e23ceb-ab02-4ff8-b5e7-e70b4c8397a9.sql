
-- Fix the security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.business_settings_public;

CREATE VIEW public.business_settings_public
WITH (security_invoker = true) AS
SELECT 
  id, business_name, tagline, logo_url, currency, vat_percentage,
  phone, email, address, city, country, whatsapp_number,
  loyalty_points_rate, loyalty_redemption_rate, loyalty_tiers,
  created_at, updated_at
FROM public.business_settings;

-- Also add a policy for anonymous users to read business settings
-- (needed for public storefront to show business name, logo, etc.)
CREATE POLICY "Anon can view business settings"
ON public.business_settings
FOR SELECT
TO anon
USING (true);
