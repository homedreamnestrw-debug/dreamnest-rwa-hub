ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS supplier_invoice text;

GRANT SELECT (is_online, country_of_origin) ON public.products TO anon;
GRANT SELECT (is_online, country_of_origin, supplier_invoice), UPDATE (is_online, country_of_origin, supplier_invoice), INSERT (is_online, country_of_origin, supplier_invoice) ON public.products TO authenticated;

CREATE TABLE public.product_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_name text,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.product_audit_log(product_id, created_at DESC);
GRANT SELECT, INSERT ON public.product_audit_log TO authenticated;
GRANT ALL ON public.product_audit_log TO service_role;
ALTER TABLE public.product_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read product history" ON public.product_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff') OR has_role(auth.uid(),'stock_manager'));
CREATE POLICY "Staff add import entries" ON public.product_audit_log FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff') OR has_role(auth.uid(),'stock_manager')) AND performed_by = auth.uid() AND action = 'imported');

CREATE OR REPLACE FUNCTION public.tg_product_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  diff jsonb := '{}'::jsonb;
  k text;
  tracked text[] := ARRAY['name','price','cost_price','sku','category_id','is_active','is_online','featured','low_stock_threshold','tax_enabled','description','country_of_origin','supplier_invoice'];
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_audit_log(product_id, product_name, action, changes, performed_by)
    VALUES (NEW.id, NEW.name, 'created', jsonb_build_object('price', NEW.price, 'sku', NEW.sku, 'country_of_origin', NEW.country_of_origin, 'supplier_invoice', NEW.supplier_invoice), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO product_audit_log(product_id, product_name, action, changes, performed_by)
    VALUES (OLD.id, OLD.name, 'deleted', jsonb_build_object('sku', OLD.sku), auth.uid());
    RETURN OLD;
  END IF;
  FOREACH k IN ARRAY tracked LOOP
    IF (to_jsonb(OLD)->k) IS DISTINCT FROM (to_jsonb(NEW)->k) THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(OLD)->k, 'to', to_jsonb(NEW)->k));
    END IF;
  END LOOP;
  IF diff = '{}'::jsonb THEN RETURN NEW; END IF;
  act := CASE WHEN (SELECT count(*) FROM jsonb_object_keys(diff)) = 1 AND (diff ? 'is_active' OR diff ? 'is_online') THEN 'status_changed' ELSE 'updated' END;
  INSERT INTO product_audit_log(product_id, product_name, action, changes, performed_by)
  VALUES (NEW.id, NEW.name, act, diff, auth.uid());
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_product_audit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER product_audit AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.tg_product_audit();