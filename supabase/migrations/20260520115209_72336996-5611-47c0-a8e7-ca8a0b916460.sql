-- Delete empty orders (no order_items) that were created by failed POS retries
DELETE FROM public.invoices WHERE order_id IN (
  SELECT o.id FROM public.orders o
  WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
);
DELETE FROM public.orders WHERE id IN (
  SELECT o.id FROM public.orders o
  WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
);
-- Also delete any invoices with zero items
DELETE FROM public.invoices i
WHERE NOT EXISTS (SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = i.id);