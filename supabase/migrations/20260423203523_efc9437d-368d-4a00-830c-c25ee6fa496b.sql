-- Attach the existing generate_document_number() trigger function to invoices and purchase_orders
DROP TRIGGER IF EXISTS set_document_number ON public.invoices;
CREATE TRIGGER set_document_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_document_number();

DROP TRIGGER IF EXISTS set_po_number ON public.purchase_orders;
CREATE TRIGGER set_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_document_number();

-- Fix existing TEMP row(s) by assigning a proper number
UPDATE public.invoices
SET document_number = CASE document_type
  WHEN 'invoice'  THEN 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 4, '0')
  WHEN 'proforma' THEN 'PRF-' || LPAD(nextval('public.proforma_number_seq')::text, 4, '0')
  WHEN 'receipt'  THEN 'REC-' || LPAD(nextval('public.receipt_number_seq')::text, 4, '0')
  WHEN 'quote'    THEN 'QTE-' || LPAD(nextval('public.quote_number_seq')::text, 4, '0')
END
WHERE document_number = 'TEMP' OR document_number IS NULL;