
DROP FUNCTION IF EXISTS public.get_public_business_settings();

CREATE FUNCTION public.get_public_business_settings()
RETURNS TABLE(
  address text,
  business_name text,
  city text,
  country text,
  created_at timestamptz,
  currency text,
  email text,
  id uuid,
  logo_url text,
  loyalty_points_rate numeric,
  loyalty_redemption_rate numeric,
  loyalty_tiers jsonb,
  phone text,
  tagline text,
  updated_at timestamptz,
  vat_percentage numeric,
  whatsapp_number text,
  receipt_header text,
  receipt_footer text,
  receipt_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    address, business_name, city, country, created_at, currency, email, id,
    logo_url, loyalty_points_rate, loyalty_redemption_rate, loyalty_tiers,
    phone, tagline, updated_at, vat_percentage, whatsapp_number,
    receipt_header, receipt_footer, receipt_logo_url
  FROM public.business_settings
  LIMIT 1;
$$;
