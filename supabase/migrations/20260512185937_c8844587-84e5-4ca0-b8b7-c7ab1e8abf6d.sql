-- Add description column to product_variants
ALTER TABLE public.product_variants
ADD COLUMN description TEXT DEFAULT NULL;

-- Also add barcode column if useful, but user only asked for description
-- description is already added above

-- Update the existing RLS policies already cover this column since they're table-wide
-- No new RLS needed since existing Admin/staff can manage variants covers ALL columns

COMMENT ON COLUMN public.product_variants.description IS 'Optional variant-specific description shown on product page when this variant is selected';