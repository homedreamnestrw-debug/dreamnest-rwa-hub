-- Step 1: Create product_stock table for per-product, per-location inventory
CREATE TABLE IF NOT EXISTS public.product_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.stock_locations(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can manage product stock"
ON public.product_stock FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin/staff can view product stock"
ON public.product_stock FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_product_stock_updated_at
BEFORE UPDATE ON public.product_stock
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 2: Backfill — one row per product at the first active location
INSERT INTO public.product_stock (product_id, location_id, quantity)
SELECT p.id, (SELECT id FROM public.stock_locations WHERE is_active = true ORDER BY created_at LIMIT 1), p.stock_quantity
FROM public.products p
WHERE EXISTS (SELECT 1 FROM public.stock_locations WHERE is_active = true)
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Step 3: Sync trigger — keep products.stock_quantity = SUM(product_stock.quantity)
CREATE OR REPLACE FUNCTION public.sync_product_total_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
  SET stock_quantity = COALESCE((SELECT SUM(quantity) FROM public.product_stock WHERE product_id = pid), 0)
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_product_total_stock
AFTER INSERT OR UPDATE OR DELETE ON public.product_stock
FOR EACH ROW EXECUTE FUNCTION public.sync_product_total_stock();

-- Step 4: Update deduct_stock_on_order_item to be location-aware
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_stock INTEGER;
  product_name TEXT;
  order_channel text;
  order_approved boolean;
  order_loc uuid;
  target_loc uuid;
BEGIN
  SELECT channel, payment_approved, location_id INTO order_channel, order_approved, order_loc
  FROM public.orders WHERE id = NEW.order_id;

  IF order_approved = true OR order_channel = 'in_store' THEN
    -- Choose location: order's location, else first active location
    target_loc := order_loc;
    IF target_loc IS NULL THEN
      SELECT id INTO target_loc FROM public.stock_locations WHERE is_active = true ORDER BY created_at LIMIT 1;
    END IF;

    SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;

    IF target_loc IS NOT NULL THEN
      -- Lock the per-location stock row
      SELECT quantity INTO prev_stock FROM public.product_stock
      WHERE product_id = NEW.product_id AND location_id = target_loc FOR UPDATE;

      IF prev_stock IS NULL THEN
        -- No row yet at this location → create one (qty 0) then re-check
        INSERT INTO public.product_stock (product_id, location_id, quantity)
        VALUES (NEW.product_id, target_loc, 0)
        ON CONFLICT (product_id, location_id) DO NOTHING;
        prev_stock := 0;
      END IF;

      IF COALESCE(prev_stock, 0) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: have %, need % at this location',
          COALESCE(product_name, NEW.product_id::text), COALESCE(prev_stock, 0), NEW.quantity;
      END IF;

      UPDATE public.product_stock
      SET quantity = quantity - NEW.quantity
      WHERE product_id = NEW.product_id AND location_id = target_loc;

      INSERT INTO public.stock_movements (product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, reason)
      VALUES (NEW.product_id, NEW.variant_id, target_loc, 'sale', NEW.quantity, prev_stock, prev_stock - NEW.quantity, 'Order item created');
    ELSE
      -- Fallback: no locations at all → deduct from global products row
      SELECT stock_quantity INTO prev_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
      IF COALESCE(prev_stock, 0) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
          COALESCE(product_name, NEW.product_id::text), COALESCE(prev_stock, 0), NEW.quantity;
      END IF;
      UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
      INSERT INTO public.stock_movements (product_id, variant_id, movement_type, quantity, previous_stock, new_stock, reason)
      VALUES (NEW.product_id, NEW.variant_id, 'sale', NEW.quantity, prev_stock, prev_stock - NEW.quantity, 'Order item created');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 5: Update approve_order_payment to be location-aware
CREATE OR REPLACE FUNCTION public.approve_order_payment(order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  prev_stock INTEGER;
  product_name TEXT;
  order_loc uuid;
  target_loc uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  SELECT location_id INTO order_loc FROM public.orders WHERE id = approve_order_payment.order_id;

  UPDATE public.orders
  SET payment_approved = true,
      payment_approved_by = auth.uid(),
      payment_approved_at = now(),
      payment_status = 'paid',
      status = 'processing'
  WHERE id = approve_order_payment.order_id AND payment_approved = false;

  FOR item IN SELECT * FROM public.order_items WHERE order_items.order_id = approve_order_payment.order_id
  LOOP
    target_loc := order_loc;
    IF target_loc IS NULL THEN
      SELECT id INTO target_loc FROM public.stock_locations WHERE is_active = true ORDER BY created_at LIMIT 1;
    END IF;

    SELECT name INTO product_name FROM public.products WHERE id = item.product_id;

    IF target_loc IS NOT NULL THEN
      SELECT quantity INTO prev_stock FROM public.product_stock
      WHERE product_id = item.product_id AND location_id = target_loc FOR UPDATE;

      IF prev_stock IS NULL THEN
        INSERT INTO public.product_stock (product_id, location_id, quantity)
        VALUES (item.product_id, target_loc, 0)
        ON CONFLICT (product_id, location_id) DO NOTHING;
        prev_stock := 0;
      END IF;

      IF COALESCE(prev_stock, 0) < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: have %, need % at this location',
          COALESCE(product_name, item.product_id::text), COALESCE(prev_stock, 0), item.quantity;
      END IF;

      UPDATE public.product_stock
      SET quantity = quantity - item.quantity
      WHERE product_id = item.product_id AND location_id = target_loc;

      INSERT INTO public.stock_movements (product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, reason)
      VALUES (item.product_id, item.variant_id, target_loc, 'sale', item.quantity, prev_stock, prev_stock - item.quantity, 'Payment approved - stock deducted');
    ELSE
      SELECT stock_quantity INTO prev_stock FROM public.products WHERE id = item.product_id FOR UPDATE;
      IF COALESCE(prev_stock, 0) < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
          COALESCE(product_name, item.product_id::text), COALESCE(prev_stock, 0), item.quantity;
      END IF;
      UPDATE public.products SET stock_quantity = stock_quantity - item.quantity WHERE id = item.product_id;
      INSERT INTO public.stock_movements (product_id, variant_id, movement_type, quantity, previous_stock, new_stock, reason)
      VALUES (item.product_id, item.variant_id, 'sale', item.quantity, prev_stock, prev_stock - item.quantity, 'Payment approved - stock deducted');
    END IF;
  END LOOP;
END;
$$;

-- Step 6: Atomic transfer between two locations
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_product_id uuid,
  p_from_location uuid,
  p_to_location uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src_qty integer;
  dst_qty integer;
  product_name text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  IF p_from_location = p_to_location THEN
    RAISE EXCEPTION 'Source and destination must differ';
  END IF;

  SELECT name INTO product_name FROM public.products WHERE id = p_product_id;

  -- Lock source
  SELECT quantity INTO src_qty FROM public.product_stock
  WHERE product_id = p_product_id AND location_id = p_from_location FOR UPDATE;

  IF src_qty IS NULL OR src_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at source for %: have %, need %',
      COALESCE(product_name, p_product_id::text), COALESCE(src_qty, 0), p_quantity;
  END IF;

  -- Ensure destination row exists, then lock
  INSERT INTO public.product_stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_to_location, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  SELECT quantity INTO dst_qty FROM public.product_stock
  WHERE product_id = p_product_id AND location_id = p_to_location FOR UPDATE;

  -- Move
  UPDATE public.product_stock SET quantity = quantity - p_quantity
  WHERE product_id = p_product_id AND location_id = p_from_location;

  UPDATE public.product_stock SET quantity = quantity + p_quantity
  WHERE product_id = p_product_id AND location_id = p_to_location;

  -- Log
  INSERT INTO public.stock_movements (product_id, location_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (p_product_id, p_from_location, 'transfer', -p_quantity, src_qty, src_qty - p_quantity, 'Transfer out', auth.uid());

  INSERT INTO public.stock_movements (product_id, location_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (p_product_id, p_to_location, 'transfer', p_quantity, dst_qty, dst_qty + p_quantity, 'Transfer in', auth.uid());
END;
$$;

-- Step 7: Helper to auto-create product_stock rows when a new location is created
CREATE OR REPLACE FUNCTION public.seed_product_stock_for_new_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_stock (product_id, location_id, quantity)
  SELECT id, NEW.id, 0 FROM public.products
  ON CONFLICT (product_id, location_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_product_stock_on_new_location
AFTER INSERT ON public.stock_locations
FOR EACH ROW EXECUTE FUNCTION public.seed_product_stock_for_new_location();

-- Step 8: Helper to auto-create product_stock rows when a new product is created
CREATE OR REPLACE FUNCTION public.seed_product_stock_for_new_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_stock (product_id, location_id, quantity)
  SELECT NEW.id, id, 0 FROM public.stock_locations WHERE is_active = true
  ON CONFLICT (product_id, location_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_product_stock_on_new_product
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.seed_product_stock_for_new_product();