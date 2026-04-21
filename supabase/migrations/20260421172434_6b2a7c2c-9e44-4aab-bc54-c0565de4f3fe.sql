-- 1. Fix approve_order_payment to also set payment_status = 'paid' and guard against insufficient stock
CREATE OR REPLACE FUNCTION public.approve_order_payment(order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item RECORD;
  prev_stock INTEGER;
  product_name TEXT;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  -- Mark order as approved AND paid
  UPDATE public.orders
  SET payment_approved = true,
      payment_approved_by = auth.uid(),
      payment_approved_at = now(),
      payment_status = 'paid',
      status = 'processing'
  WHERE id = order_id AND payment_approved = false;

  -- Deduct stock for each item, refusing if insufficient
  FOR item IN SELECT * FROM public.order_items WHERE order_items.order_id = approve_order_payment.order_id
  LOOP
    SELECT stock_quantity, name INTO prev_stock, product_name
    FROM public.products WHERE id = item.product_id FOR UPDATE;

    IF COALESCE(prev_stock, 0) < item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
        COALESCE(product_name, item.product_id::text), COALESCE(prev_stock, 0), item.quantity;
    END IF;

    UPDATE public.products SET stock_quantity = stock_quantity - item.quantity WHERE id = item.product_id;
    INSERT INTO public.stock_movements (product_id, variant_id, movement_type, quantity, previous_stock, new_stock, reason)
    VALUES (item.product_id, item.variant_id, 'sale', item.quantity, prev_stock, prev_stock - item.quantity, 'Payment approved - stock deducted');
  END LOOP;
END;
$function$;

-- 2. Harden deduct_stock_on_order_item trigger to refuse negative stock
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prev_stock INTEGER;
  product_name TEXT;
  order_channel text;
  order_approved boolean;
BEGIN
  SELECT channel, payment_approved INTO order_channel, order_approved
  FROM public.orders WHERE id = NEW.order_id;

  IF order_approved = true OR order_channel = 'in_store' THEN
    SELECT stock_quantity, name INTO prev_stock, product_name
    FROM public.products WHERE id = NEW.product_id FOR UPDATE;

    IF COALESCE(prev_stock, 0) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
        COALESCE(product_name, NEW.product_id::text), COALESCE(prev_stock, 0), NEW.quantity;
    END IF;

    UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
    INSERT INTO public.stock_movements (product_id, variant_id, movement_type, quantity, previous_stock, new_stock, reason)
    VALUES (NEW.product_id, NEW.variant_id, 'sale', NEW.quantity, prev_stock, prev_stock - NEW.quantity, 'Order item created');
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. One-off repair: log adjustment movements for every negative-stock product, then reset to 0
INSERT INTO public.stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason)
SELECT id, 'adjustment', -stock_quantity, stock_quantity, 0, 'Negative stock cleanup'
FROM public.products
WHERE stock_quantity < 0;

UPDATE public.products SET stock_quantity = 0 WHERE stock_quantity < 0;