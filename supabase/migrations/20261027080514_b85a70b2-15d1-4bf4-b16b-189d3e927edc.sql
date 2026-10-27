-- Invoices: track who created the document
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by uuid;

-- Keep Data API grants intact (no new table, re-assert to be safe)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT SELECT ON public.invoices TO anon;

-- Auto-fill created_by with the signed-in staff member on insert
CREATE OR REPLACE FUNCTION public.set_invoice_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_invoice_created_by() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tg_invoice_created_by ON public.invoices;
CREATE TRIGGER tg_invoice_created_by
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_created_by();

-- Backfill: receipts/invoices linked to POS orders take the serving staff member
UPDATE public.invoices i
SET created_by = o.served_by
FROM public.orders o
WHERE i.order_id = o.id
  AND i.created_by IS NULL
  AND o.served_by IS NOT NULL;