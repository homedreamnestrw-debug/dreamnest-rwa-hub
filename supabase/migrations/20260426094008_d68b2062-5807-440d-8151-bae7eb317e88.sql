
-- Drop overly broad guest SELECT policies that exposed all guest orders' PII to the public
DROP POLICY IF EXISTS "Guests can view guest orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view guest order items" ON public.order_items;

-- Tighten orders INSERT policy: prevent anonymous inserts entirely. Guests must use the RPC.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Authenticated customers can create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Tighten order_items INSERT: only allow inserts for authenticated user's own orders.
-- Guest order_items are inserted via the SECURITY DEFINER RPC below.
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Authenticated users can insert items into own orders"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Secure RPC: create a guest order in one transaction. Returns only the new order id and order_number.
-- Personal data (name/email/phone/address) is written but never re-exposed via a SELECT policy.
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_order jsonb,
  p_items jsonb
)
RETURNS TABLE(id uuid, order_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id uuid;
  new_order_number integer;
  item jsonb;
BEGIN
  -- Hard-enforce guest semantics: never allow this RPC to attach an authenticated customer_id,
  -- and require basic contact fields so admins can reach the customer.
  IF (p_order ? 'customer_id') AND (p_order->>'customer_id') IS NOT NULL THEN
    RAISE EXCEPTION 'create_guest_order is for guest checkouts only';
  END IF;

  IF COALESCE(p_order->>'guest_name', '') = '' OR COALESCE(p_order->>'guest_phone', '') = '' THEN
    RAISE EXCEPTION 'Guest name and phone are required';
  END IF;

  -- Insert the order. We whitelist columns explicitly to prevent client-supplied
  -- privileged fields (e.g. payment_approved, served_by, payment_approved_by) from being set.
  INSERT INTO public.orders (
    channel,
    status,
    payment_status,
    payment_method,
    subtotal,
    tax_amount,
    discount_amount,
    total,
    shipping_address,
    shipping_city,
    notes,
    customer_id,
    guest_name,
    guest_email,
    guest_phone
  )
  VALUES (
    'online'::sale_channel,
    'pending'::order_status,
    COALESCE((p_order->>'payment_status')::payment_status, 'unpaid'::payment_status),
    NULLIF(p_order->>'payment_method','')::payment_method,
    COALESCE((p_order->>'subtotal')::bigint, 0),
    COALESCE((p_order->>'tax_amount')::bigint, 0),
    COALESCE((p_order->>'discount_amount')::bigint, 0),
    COALESCE((p_order->>'total')::bigint, 0),
    p_order->>'shipping_address',
    p_order->>'shipping_city',
    NULLIF(p_order->>'notes',''),
    NULL,
    p_order->>'guest_name',
    NULLIF(p_order->>'guest_email',''),
    p_order->>'guest_phone'
  )
  RETURNING orders.id, orders.order_number
  INTO new_order_id, new_order_number;

  -- Insert items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      unit_price,
      discount,
      total
    )
    VALUES (
      new_order_id,
      NULLIF(item->>'product_id','')::uuid,
      NULLIF(item->>'variant_id','')::uuid,
      COALESCE((item->>'quantity')::int, 1),
      COALESCE((item->>'unit_price')::bigint, 0),
      COALESCE((item->>'discount')::bigint, 0),
      COALESCE((item->>'total')::bigint, 0)
    );
  END LOOP;

  RETURN QUERY SELECT new_order_id, new_order_number;
END;
$$;

-- Allow anonymous and authenticated callers to invoke the RPC (it self-restricts to guest orders).
GRANT EXECUTE ON FUNCTION public.create_guest_order(jsonb, jsonb) TO anon, authenticated;
