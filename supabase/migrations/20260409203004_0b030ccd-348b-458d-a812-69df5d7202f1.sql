
-- 1. Fix business_settings: only admins should see full table including SMTP
DROP POLICY IF EXISTS "Authenticated users can view business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Anon can view business settings" ON public.business_settings;

-- Admin sees everything via the existing ALL policy
-- Create a security definer function for public-facing settings (no SMTP)
CREATE OR REPLACE FUNCTION public.get_public_business_settings()
RETURNS TABLE (
  id uuid,
  business_name text,
  tagline text,
  logo_url text,
  currency text,
  vat_percentage numeric,
  phone text,
  email text,
  address text,
  city text,
  country text,
  whatsapp_number text,
  loyalty_points_rate numeric,
  loyalty_redemption_rate numeric,
  loyalty_tiers jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bs.id, bs.business_name, bs.tagline, bs.logo_url, bs.currency, bs.vat_percentage,
    bs.phone, bs.email, bs.address, bs.city, bs.country, bs.whatsapp_number,
    bs.loyalty_points_rate, bs.loyalty_redemption_rate, bs.loyalty_tiers,
    bs.created_at, bs.updated_at
  FROM public.business_settings bs
  LIMIT 1;
$$;

-- Drop the view (it was causing security_definer_view warning)
DROP VIEW IF EXISTS public.business_settings_public;

-- 2. Fix documents bucket: add UPDATE policy
CREATE POLICY "Admin/staff can update documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);
