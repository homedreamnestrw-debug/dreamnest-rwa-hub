
-- Add guest checkout and staff/location tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.stock_locations(id),
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS served_by uuid;

-- Index for staff attribution and location queries
CREATE INDEX IF NOT EXISTS idx_orders_served_by ON public.orders(served_by);
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON public.orders(location_id);
