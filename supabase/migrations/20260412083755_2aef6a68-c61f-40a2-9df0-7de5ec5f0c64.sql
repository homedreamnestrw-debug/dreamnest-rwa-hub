-- Add payment approval columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_approved_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_approved_at timestamptz DEFAULT NULL;

-- Auto-approve existing orders and all in_store orders
UPDATE public.orders SET payment_approved = true WHERE channel = 'in_store' OR status != 'pending';
UPDATE public.orders SET payment_approved = true WHERE payment_status = 'paid';

-- Drop the old stock deduction trigger on order_items
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_order_item ON public.order_items;

-- Create new stock deduction function that checks payment_approved
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prev_stock INTEGER;
  order_channel text;
  order_approved boolean;
BEGIN
  -- Check if the order is approved (in_store orders are auto-approved)
  SELECT channel, payment_approved INTO order_channel, order_approved
  FROM public.orders WHERE id = NEW.order_id;

  -- Only deduct stock if payment is approved or it's an in_store order
  IF order_approved = true OR order_channel = 'in_store' THEN
    SELECT stock_quantity INTO prev_stock FROM public.products WHERE id = NEW.product_id;
    UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
    INSERT INTO public.stock_movements (product_id, variant_id, movement_type, quantity, previous_stock, new_stock, reason)
    VALUES (NEW.product_id, NEW.variant_id, 'sale', NEW.quantity, COALESCE(prev_stock, 0), COALESCE(prev_stock, 0) - NEW.quantity, 'Order item created');
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER trigger_deduct_stock_on_order_item
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order_item();

-- Function to approve payment and deduct stock for all items in the order
CREATE OR REPLACE FUNCTION public.approve_order_payment(order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  item RECORD;
  prev_stock INTEGER;
BEGIN
  -- Check caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  -- Mark order as approved
  UPDATE public.orders
  SET payment_approved = true,
      payment_approved_by = auth.uid(),
      payment_approved_at = now(),
      status = 'processing'
  WHERE id = order_id AND payment_approved = false;

  -- Deduct stock for each item
  FOR item IN SELECT * FROM public.order_items WHERE order_items.order_id = approve_order_payment.order_id
  LOOP
    SELECT stock_quantity INTO prev_stock FROM public.products WHERE id = item.product_id;
    UPDATE public.products SET stock_quantity = stock_quantity - item.quantity WHERE id = item.product_id;
    INSERT INTO public.stock_movements (product_id, variant_id, movement_type, quantity, previous_stock, new_stock, reason)
    VALUES (item.product_id, item.variant_id, 'sale', item.quantity, COALESCE(prev_stock, 0), COALESCE(prev_stock, 0) - item.quantity, 'Payment approved - stock deducted');
  END LOOP;
END;
$$;

-- Function to reject payment (cancel order, no stock change needed since stock wasn't deducted)
CREATE OR REPLACE FUNCTION public.reject_order_payment(order_id uuid, rejection_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject payments';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      notes = COALESCE(notes || E'\n', '') || 'Payment rejected: ' || COALESCE(rejection_note, 'No reason provided'),
      payment_approved = false
  WHERE id = order_id AND payment_approved = false;
END;
$$;

-- Auto-approve in_store orders on insert
CREATE OR REPLACE FUNCTION public.auto_approve_instore_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.channel = 'in_store' THEN
    NEW.payment_approved := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_approve_instore ON public.orders;
CREATE TRIGGER trigger_auto_approve_instore
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_instore_orders();