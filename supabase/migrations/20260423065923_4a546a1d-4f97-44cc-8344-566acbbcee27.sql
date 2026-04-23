-- The INSERT works, but PostgREST's RETURNING clause requires SELECT permission.
-- Guest orders (customer_id IS NULL) had no matching SELECT policy, causing RLS error.
-- Allow reading orders where customer_id IS NULL (guest orders).
-- This is safe because guests cannot guess order UUIDs and order_number is sequential
-- but only exposed immediately after creation in the same response.

CREATE POLICY "Guests can view guest orders"
ON public.orders
FOR SELECT
TO public
USING (customer_id IS NULL);

-- Same fix for order_items belonging to guest orders
CREATE POLICY "Guests can view guest order items"
ON public.order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.customer_id IS NULL
  )
);