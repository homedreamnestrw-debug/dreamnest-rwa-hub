
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS receipt_header text,
  ADD COLUMN IF NOT EXISTS receipt_footer text,
  ADD COLUMN IF NOT EXISTS receipt_logo_url text;
