-- Allow guest (unauthenticated) users to create orders with null customer_id
CREATE POLICY "Guests can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (customer_id IS NULL);

-- Allow guests to insert order items for their orders
CREATE POLICY "Guests can insert order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (true);
