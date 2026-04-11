-- Guest needs SELECT to read back the order after insert (.select() in the client)
CREATE POLICY "Guests can view guest orders"
ON public.orders
FOR SELECT
TO anon
USING (customer_id IS NULL);

-- Guest needs SELECT on order_items too
CREATE POLICY "Guests can view guest order items"
ON public.order_items
FOR SELECT
TO anon
USING (true);
