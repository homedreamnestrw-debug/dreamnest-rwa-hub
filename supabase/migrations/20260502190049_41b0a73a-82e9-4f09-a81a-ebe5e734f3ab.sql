-- Add delivery method and customer preferences to orders
DO $$ BEGIN
  CREATE TYPE public.delivery_method AS ENUM ('ship', 'pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method public.delivery_method NOT NULL DEFAULT 'ship',
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS save_info boolean NOT NULL DEFAULT false;