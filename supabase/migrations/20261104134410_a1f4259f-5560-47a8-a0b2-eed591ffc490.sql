ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_location_id uuid REFERENCES public.stock_locations(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.stock_locations(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.stock_locations(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.default_location_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.stock_locations WHERE is_active ORDER BY created_at LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.user_assigned_location(_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT assigned_location_id FROM public.profiles WHERE user_id = _uid LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.can_access_location(_loc uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(auth.uid(),'admin')
      OR public.user_assigned_location(auth.uid()) IS NULL
      OR _loc IS NULL
      OR _loc = public.user_assigned_location(auth.uid()) $$;
REVOKE EXECUTE ON FUNCTION public.default_location_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_assigned_location(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_location(uuid) FROM anon;

-- Stamp location on new orders / invoices
CREATE OR REPLACE FUNCTION public.tg_set_order_location() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.location_id IS NULL THEN NEW.location_id := public.default_location_id(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_set_order_location ON public.orders;
CREATE TRIGGER trg_set_order_location BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_order_location();

CREATE OR REPLACE FUNCTION public.tg_set_invoice_location() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.location_id IS NULL AND NEW.order_id IS NOT NULL THEN
    SELECT location_id INTO NEW.location_id FROM public.orders WHERE id = NEW.order_id;
  END IF;
  IF NEW.location_id IS NULL THEN NEW.location_id := public.user_assigned_location(auth.uid()); END IF;
  IF NEW.location_id IS NULL THEN NEW.location_id := public.default_location_id(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_set_invoice_location ON public.invoices;
CREATE TRIGGER trg_set_invoice_location BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_set_invoice_location();
REVOKE EXECUTE ON FUNCTION public.tg_set_order_location() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_invoice_location() FROM anon, authenticated;

-- Backfill
UPDATE public.orders SET location_id = public.default_location_id() WHERE location_id IS NULL;
UPDATE public.invoices i SET location_id = o.location_id FROM public.orders o WHERE i.order_id = o.id AND i.location_id IS NULL;
UPDATE public.invoices SET location_id = public.default_location_id() WHERE location_id IS NULL;

-- Location-scoped staff access
DROP POLICY IF EXISTS "Admin/staff can manage orders" ON public.orders;
CREATE POLICY "Admin/staff can manage orders" ON public.orders FOR ALL TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND public.can_access_location(location_id))
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND public.can_access_location(location_id));

DROP POLICY IF EXISTS "Admin/staff can manage invoices" ON public.invoices;
CREATE POLICY "Admin/staff can manage invoices" ON public.invoices FOR ALL TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND public.can_access_location(location_id))
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND public.can_access_location(location_id));

-- Staff cannot change their own assigned branch
CREATE OR REPLACE FUNCTION public.tg_protect_assigned_location() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.assigned_location_id IS DISTINCT FROM OLD.assigned_location_id
     AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can change branch assignment';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_assigned_location ON public.profiles;
CREATE TRIGGER trg_protect_assigned_location BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_protect_assigned_location();
REVOKE EXECUTE ON FUNCTION public.tg_protect_assigned_location() FROM anon, authenticated;