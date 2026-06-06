
-- Admin-only -> admin or stock_manager
DROP POLICY IF EXISTS "Admin can manage suppliers" ON public.suppliers;
CREATE POLICY "Admin or stock manager can manage suppliers"
  ON public.suppliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin can manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Admin or stock manager can manage purchase orders"
  ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin can manage PO items" ON public.purchase_order_items;
CREATE POLICY "Admin or stock manager can manage PO items"
  ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin can manage locations" ON public.stock_locations;
CREATE POLICY "Admin or stock manager can manage locations"
  ON public.stock_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin/staff can view locations" ON public.stock_locations;
CREATE POLICY "Admin staff or stock manager can view locations"
  ON public.stock_locations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'stock_manager')
  );

-- Admin/staff -> +stock_manager
DROP POLICY IF EXISTS "Admin/staff can manage categories" ON public.categories;
CREATE POLICY "Admin staff or stock manager can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin/staff can manage products" ON public.products;
CREATE POLICY "Admin staff or stock manager can manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin/staff can manage variants" ON public.product_variants;
CREATE POLICY "Admin staff or stock manager can manage variants"
  ON public.product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin/staff can manage product stock" ON public.product_stock;
CREATE POLICY "Admin staff or stock manager can manage product stock"
  ON public.product_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin/staff can manage variant stock" ON public.variant_stock;
CREATE POLICY "Admin staff or stock manager can manage variant stock"
  ON public.variant_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'));

DROP POLICY IF EXISTS "Admin/staff can manage stock movements" ON public.stock_movements;
CREATE POLICY "Admin staff or stock manager can manage stock movements"
  ON public.stock_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'stock_manager'));

-- SECURITY DEFINER functions: allow stock_manager
CREATE OR REPLACE FUNCTION public.get_admin_products_with_costs()
 RETURNS SETOF public.products
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'stock_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.products;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_product_id uuid, p_from_location uuid, p_to_location uuid, p_quantity integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE src_qty integer; dst_qty integer; product_name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'stock_manager')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF p_from_location = p_to_location THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  SELECT name INTO product_name FROM public.products WHERE id = p_product_id;
  SELECT quantity INTO src_qty FROM public.product_stock
    WHERE product_id = p_product_id AND location_id = p_from_location FOR UPDATE;
  IF src_qty IS NULL OR src_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at source for %: have %, need %',
      COALESCE(product_name, p_product_id::text), COALESCE(src_qty, 0), p_quantity;
  END IF;
  INSERT INTO public.product_stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_to_location, 0) ON CONFLICT (product_id, location_id) DO NOTHING;
  SELECT quantity INTO dst_qty FROM public.product_stock
    WHERE product_id = p_product_id AND location_id = p_to_location FOR UPDATE;
  UPDATE public.product_stock SET quantity = quantity - p_quantity
    WHERE product_id = p_product_id AND location_id = p_from_location;
  UPDATE public.product_stock SET quantity = quantity + p_quantity
    WHERE product_id = p_product_id AND location_id = p_to_location;
  INSERT INTO public.stock_movements (product_id, location_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (p_product_id, p_from_location, 'transfer', -p_quantity, src_qty, src_qty - p_quantity, 'Transfer out', auth.uid());
  INSERT INTO public.stock_movements (product_id, location_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (p_product_id, p_to_location, 'transfer', p_quantity, dst_qty, dst_qty + p_quantity, 'Transfer in', auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_variant_stock(
  p_variant_id uuid, p_from_location uuid, p_to_location uuid, p_quantity integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE src_qty integer; dst_qty integer; pid uuid; vname text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'stock_manager')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF p_from_location = p_to_location THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  SELECT product_id, variant_name INTO pid, vname FROM public.product_variants WHERE id = p_variant_id;
  SELECT quantity INTO src_qty FROM public.variant_stock
    WHERE variant_id = p_variant_id AND location_id = p_from_location FOR UPDATE;
  IF src_qty IS NULL OR src_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient variant stock at source for %: have %, need %',
      COALESCE(vname, p_variant_id::text), COALESCE(src_qty, 0), p_quantity;
  END IF;
  INSERT INTO public.variant_stock (variant_id, location_id, quantity)
  VALUES (p_variant_id, p_to_location, 0) ON CONFLICT (variant_id, location_id) DO NOTHING;
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
$function$;

CREATE OR REPLACE FUNCTION public.adjust_variant_stock(
  p_variant_id uuid, p_location_id uuid, p_new_quantity integer,
  p_movement_type public.stock_movement_type DEFAULT 'adjustment'::public.stock_movement_type,
  p_reason text DEFAULT NULL::text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE prev_qty integer; pid uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'stock_manager')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_new_quantity < 0 THEN RAISE EXCEPTION 'Quantity cannot be negative'; END IF;
  SELECT product_id INTO pid FROM public.product_variants WHERE id = p_variant_id;
  IF pid IS NULL THEN RAISE EXCEPTION 'Variant not found'; END IF;
  INSERT INTO public.variant_stock (variant_id, location_id, quantity)
  VALUES (p_variant_id, p_location_id, 0) ON CONFLICT (variant_id, location_id) DO NOTHING;
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
$function$;
