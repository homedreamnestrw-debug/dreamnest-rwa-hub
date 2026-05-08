
DELETE FROM public.invoice_audit_log;
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;
DELETE FROM public.voucher_redemptions;
DELETE FROM public.gift_vouchers;
DELETE FROM public.credit_payments;
DELETE FROM public.loyalty_points_log;
DELETE FROM public.stock_movements WHERE reason ILIKE '%order%' OR movement_type = 'sale';
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.contact_submissions;
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;

ALTER SEQUENCE IF EXISTS public.orders_order_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.invoice_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.proforma_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.receipt_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.quote_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.po_number_seq RESTART WITH 1;
