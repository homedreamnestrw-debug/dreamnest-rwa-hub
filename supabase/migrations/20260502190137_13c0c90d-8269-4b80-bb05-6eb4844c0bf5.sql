CREATE OR REPLACE FUNCTION public.create_guest_order(p_order jsonb, p_items jsonb)
 RETURNS TABLE(id uuid, order_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_order_id uuid;
  new_order_number integer;
  item jsonb;
BEGIN
  IF (p_order ? 'customer_id') AND (p_order->>'customer_id') IS NOT NULL THEN
    RAISE EXCEPTION 'create_guest_order is for guest checkouts only';
  END IF;

  IF COALESCE(p_order->>'guest_name', '') = '' OR COALESCE(p_order->>'guest_phone', '') = '' THEN
    RAISE EXCEPTION 'Guest name and phone are required';
  END IF;

  INSERT INTO public.orders (
    channel, status, payment_status, payment_method,
    subtotal, tax_amount, discount_amount, total,
    shipping_address, shipping_city, notes,
    customer_id, guest_name, guest_email, guest_phone,
    delivery_method, marketing_opt_in, save_info
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
    p_order->>'guest_phone',
    COALESCE(NULLIF(p_order->>'delivery_method','')::delivery_method, 'ship'::delivery_method),
    COALESCE((p_order->>'marketing_opt_in')::boolean, false),
    COALESCE((p_order->>'save_info')::boolean, false)
  )
  RETURNING orders.id, orders.order_number
  INTO new_order_id, new_order_number;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, quantity, unit_price, discount, total
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
$function$;