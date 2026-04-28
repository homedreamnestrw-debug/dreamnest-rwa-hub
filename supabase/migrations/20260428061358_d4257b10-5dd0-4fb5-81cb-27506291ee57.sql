
-- 1. Option schema on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Cart uniqueness now includes variant
DROP INDEX IF EXISTS cart_items_user_product_unique;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_variant_unique
  ON public.cart_items (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. variant_stock unique + index
CREATE UNIQUE INDEX IF NOT EXISTS variant_stock_variant_location_unique
  ON public.variant_stock (variant_id, location_id);
CREATE INDEX IF NOT EXISTS variant_stock_variant_idx ON public.variant_stock (variant_id);

-- 4. Seed variant_stock for new variant
CREATE OR REPLACE FUNCTION public.seed_variant_stock_for_new_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.variant_stock (variant_id, location_id, quantity)
  SELECT NEW.id, id, 0 FROM public.stock_locations WHERE is_active = true
  ON CONFLICT (variant_id, location_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_variant_stock_for_new_variant ON public.product_variants;
CREATE TRIGGER trg_seed_variant_stock_for_new_variant
AFTER INSERT ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.seed_variant_stock_for_new_variant();

-- 5. Seed variant_stock for new location
CREATE OR REPLACE FUNCTION public.seed_variant_stock_for_new_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.variant_stock (variant_id, location_id, quantity)
  SELECT id, NEW.id, 0 FROM public.product_variants WHERE is_active = true
  ON CONFLICT (variant_id, location_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_variant_stock_for_new_location ON public.stock_locations;
CREATE TRIGGER trg_seed_variant_stock_for_new_location
AFTER INSERT ON public.stock_locations
FOR EACH ROW EXECUTE FUNCTION public.seed_variant_stock_for_new_location();

-- 6. Sync variant total + parent product total
CREATE OR REPLACE FUNCTION public.sync_variant_total_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vid uuid;
  pid uuid;
BEGIN
  vid := COALESCE(NEW.variant_id, OLD.variant_id);
  -- Update variant total
  UPDATE public.product_variants
  SET stock_quantity = COALESCE((SELECT SUM(quantity) FROM public.variant_stock WHERE variant_id = vid), 0)
  WHERE id = vid
  RETURNING product_id INTO pid;

  -- Update parent product total: sum of all variant totals (if any), else fall back to product_stock
  IF pid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = pid AND is_active = true) THEN
      UPDATE public.products
      SET stock_quantity = COALESCE((
        SELECT SUM(stock_quantity) FROM public.product_variants WHERE product_id = pid AND is_active = true
      ), 0)
      WHERE id = pid;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_variant_total_stock ON public.variant_stock;
CREATE TRIGGER trg_sync_variant_total_stock
AFTER INSERT OR UPDATE OR DELETE ON public.variant_stock
FOR EACH ROW EXECUTE FUNCTION public.sync_variant_total_stock();

-- 7. Update deduct_stock_on_order_item to handle variants
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
    target_loc := order_loc;
    IF target_loc IS NULL THEN
      SELECT id INTO target_loc FROM public.stock_locations WHERE is_active = true ORDER BY created_at LIMIT 1;
    END IF;

    SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;

    -- VARIANT path
    IF NEW.variant_id IS NOT NULL THEN
      IF target_loc IS NOT NULL THEN
        SELECT quantity INTO prev_stock FROM public.variant_stock
          WHERE variant_id = NEW.variant_id AND location_id = target_loc FOR UPDATE;

        IF prev_stock IS NULL THEN
          INSERT INTO public.variant_stock (variant_id, location_id, quantity)
          VALUES (NEW.variant_id, target_loc, 0)
          ON CONFLICT (variant_id, location_id) DO NOTHING;
          prev_stock := 0;
        END IF;

        IF COALESCE(prev_stock, 0) < NEW.quantity THEN
          RAISE EXCEPTION 'Insufficient variant stock for product %: have %, need % at this location',
            COALESCE(product_name, NEW.product_id::text), COALESCE(prev_stock, 0), NEW.quantity;
        END IF;

        UPDATE public.variant_stock
          SET quantity = quantity - NEW.quantity
          WHERE variant_id = NEW.variant_id AND location_id = target_loc;

        INSERT INTO public.stock_movements (product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, reason)
        VALUES (NEW.product_id, NEW.variant_id, target_loc, 'sale', NEW.quantity, prev_stock, prev_stock - NEW.quantity, 'Order item created (variant)');
        RETURN NEW;
      END IF;
    END IF;

    -- PRODUCT path (no variant)
    IF target_loc IS NOT NULL THEN
      SELECT quantity INTO prev_stock FROM public.product_stock
        WHERE product_id = NEW.product_id AND location_id = target_loc FOR UPDATE;

      IF prev_stock IS NULL THEN
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

-- 8. Update approve_order_payment to handle variants
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

    IF item.variant_id IS NOT NULL AND target_loc IS NOT NULL THEN
      SELECT quantity INTO prev_stock FROM public.variant_stock
        WHERE variant_id = item.variant_id AND location_id = target_loc FOR UPDATE;
      IF prev_stock IS NULL THEN
        INSERT INTO public.variant_stock (variant_id, location_id, quantity)
        VALUES (item.variant_id, target_loc, 0)
        ON CONFLICT (variant_id, location_id) DO NOTHING;
        prev_stock := 0;
      END IF;
      IF COALESCE(prev_stock, 0) < item.quantity THEN
        RAISE EXCEPTION 'Insufficient variant stock for product %: have %, need %',
          COALESCE(product_name, item.product_id::text), COALESCE(prev_stock, 0), item.quantity;
      END IF;
      UPDATE public.variant_stock SET quantity = quantity - item.quantity
        WHERE variant_id = item.variant_id AND location_id = target_loc;
      INSERT INTO public.stock_movements (product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, reason)
      VALUES (item.product_id, item.variant_id, target_loc, 'sale', item.quantity, prev_stock, prev_stock - item.quantity, 'Payment approved - variant stock deducted');
    ELSIF target_loc IS NOT NULL THEN
      SELECT quantity INTO prev_stock FROM public.product_stock
        WHERE product_id = item.product_id AND location_id = target_loc FOR UPDATE;
      IF prev_stock IS NULL THEN
        INSERT INTO public.product_stock (product_id, location_id, quantity)
        VALUES (item.product_id, target_loc, 0)
        ON CONFLICT (product_id, location_id) DO NOTHING;
        prev_stock := 0;
      END IF;
      IF COALESCE(prev_stock, 0) < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
          COALESCE(product_name, item.product_id::text), COALESCE(prev_stock, 0), item.quantity;
      END IF;
      UPDATE public.product_stock SET quantity = quantity - item.quantity
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

-- 9. Variant transfer RPC
CREATE OR REPLACE FUNCTION public.transfer_variant_stock(p_variant_id uuid, p_from_location uuid, p_to_location uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src_qty integer;
  dst_qty integer;
  pid uuid;
  vname text;
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

  SELECT product_id, variant_name INTO pid, vname FROM public.product_variants WHERE id = p_variant_id;

  SELECT quantity INTO src_qty FROM public.variant_stock
    WHERE variant_id = p_variant_id AND location_id = p_from_location FOR UPDATE;

  IF src_qty IS NULL OR src_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient variant stock at source for %: have %, need %',
      COALESCE(vname, p_variant_id::text), COALESCE(src_qty, 0), p_quantity;
  END IF;

  INSERT INTO public.variant_stock (variant_id, location_id, quantity)
  VALUES (p_variant_id, p_to_location, 0)
  ON CONFLICT (variant_id, location_id) DO NOTHING;

  SELECT quantity INTO dst_qty FROM public.variant_stock
    WHERE variant_id = p_variant_id AND location_id = p_to_location FOR UPDATE;

  UPDATE public.variant_stock SET quantity = quantity - p_quantity
    WHERE variant_id = p_variant_id AND location_id = p_from_location;
  UPDATE public.variant_stock SET quantity = quantity + p_quantity
    WHERE variant_id = p_variant_id AND location_id = p_to_location;

  INSERT INTO public.stock_movements (product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (pid, p_variant_id, p_from_location, 'transfer', -p_quantity, src_qty, src_qty - p_quantity, 'Variant transfer out', auth.uid());

  INSERT INTO public.stock_movements (product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (pid, p_variant_id, p_to_location, 'transfer', p_quantity, dst_qty, dst_qty + p_quantity, 'Variant transfer in', auth.uid());
END;
$$;
