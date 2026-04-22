-- Drop overly restrictive / role-limited policies and replace with public-role policies
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  -- Authenticated users must own the order, OR the order is a guest order (no customer_id)
  (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
  OR (customer_id IS NULL)
);

-- Same fix for order_items
DROP POLICY IF EXISTS "Guests can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND o.customer_id = auth.uid())
        OR o.customer_id IS NULL
      )
  )
);