-- 1) Backfill variant totals from variant_stock
UPDATE public.product_variants pv
SET stock_quantity = COALESCE(s.total, 0)
FROM (
  SELECT variant_id, SUM(quantity) AS total
  FROM public.variant_stock
  GROUP BY variant_id
) s
WHERE s.variant_id = pv.id;

-- 2) Backfill product totals: variants if any, otherwise product_stock sum
UPDATE public.products p
SET stock_quantity = COALESCE((
  SELECT SUM(pv.stock_quantity)
  FROM public.product_variants pv
  WHERE pv.product_id = p.id AND pv.is_active = true
), 0)
WHERE EXISTS (
  SELECT 1 FROM public.product_variants pv2
  WHERE pv2.product_id = p.id AND pv2.is_active = true
);

UPDATE public.products p
SET stock_quantity = COALESCE((
  SELECT SUM(ps.quantity) FROM public.product_stock ps WHERE ps.product_id = p.id
), 0)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true
);

-- 3) Harden sync_product_total_stock so it does NOT overwrite variant-based totals
CREATE OR REPLACE FUNCTION public.sync_product_total_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pid uuid;
  has_variants boolean;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  SELECT EXISTS (
    SELECT 1 FROM public.product_variants WHERE product_id = pid AND is_active = true
  ) INTO has_variants;

  IF NOT has_variants THEN
    UPDATE public.products
    SET stock_quantity = COALESCE((SELECT SUM(quantity) FROM public.product_stock WHERE product_id = pid), 0)
    WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4) RPC to adjust variant stock at a location and log the movement
CREATE OR REPLACE FUNCTION public.adjust_variant_stock(
  p_variant_id uuid,
  p_location_id uuid,
  p_new_quantity integer,
  p_movement_type stock_movement_type DEFAULT 'adjustment',
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev_qty integer;
  pid uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_new_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  SELECT product_id INTO pid FROM public.product_variants WHERE id = p_variant_id;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'Variant not found';
  END IF;

  INSERT INTO public.variant_stock (variant_id, location_id, quantity)
  VALUES (p_variant_id, p_location_id, 0)
  ON CONFLICT (variant_id, location_id) DO NOTHING;

  SELECT quantity INTO prev_qty FROM public.variant_stock
    WHERE variant_id = p_variant_id AND location_id = p_location_id FOR UPDATE;

  UPDATE public.variant_stock SET quantity = p_new_quantity, updated_at = now()
    WHERE variant_id = p_variant_id AND location_id = p_location_id;

  INSERT INTO public.stock_movements (
    product_id, variant_id, location_id, movement_type,
    quantity, previous_stock, new_stock, reason, performed_by
  ) VALUES (
    pid, p_variant_id, p_location_id, p_movement_type,
    p_new_quantity - COALESCE(prev_qty, 0), COALESCE(prev_qty, 0), p_new_quantity,
    p_reason, auth.uid()
  );
END;
$$;