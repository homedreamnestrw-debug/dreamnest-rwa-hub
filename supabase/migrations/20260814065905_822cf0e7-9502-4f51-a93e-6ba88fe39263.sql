CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL DEFAULT 'staff',
  user_id uuid,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications (user_id);

CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  (audience = 'user' AND user_id = auth.uid())
  OR (audience = 'staff' AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
      OR public.has_role(auth.uid(), 'stock_manager')
  ))
);

CREATE POLICY "Admins can manage notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage their own read marks"
ON public.notification_reads FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Helper to insert a staff notification
CREATE OR REPLACE FUNCTION public.notify_staff(_type text, _title text, _body text, _link text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (audience, type, title, body, link, metadata)
  VALUES ('staff', _type, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.tg_notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_staff(
    'order',
    'New ' || NEW.channel::text || ' order #' || NEW.order_number,
    'Total: ' || NEW.total::text,
    '/admin/orders',
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_order ON public.orders;
CREATE TRIGGER notify_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_order();

CREATE OR REPLACE FUNCTION public.tg_notify_contact_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_staff(
    'message',
    'New contact message',
    COALESCE(NEW.name, 'Someone') || ': ' || left(COALESCE(NEW.subject, NEW.message), 80),
    '/admin/messages',
    jsonb_build_object('submission_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_contact_submission ON public.contact_submissions;
CREATE TRIGGER notify_contact_submission
AFTER INSERT ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_contact_submission();

CREATE OR REPLACE FUNCTION public.tg_notify_credit_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_number integer;
BEGIN
  SELECT order_number INTO v_order_number FROM public.orders WHERE id = NEW.order_id;
  PERFORM public.notify_staff(
    'payment',
    'Credit payment received',
    NEW.amount::text || ' on order #' || COALESCE(v_order_number::text, '-'),
    '/admin/credit',
    jsonb_build_object('order_id', NEW.order_id, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_credit_payment ON public.credit_payments;
CREATE TRIGGER notify_credit_payment
AFTER INSERT ON public.credit_payments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_credit_payment();

CREATE OR REPLACE FUNCTION public.tg_notify_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.low_stock_threshold
     AND OLD.stock_quantity > OLD.low_stock_threshold THEN
    PERFORM public.notify_staff(
      'stock',
      'Low stock: ' || NEW.name,
      'Only ' || NEW.stock_quantity::text || ' left (threshold ' || NEW.low_stock_threshold::text || ')',
      '/admin/stock',
      jsonb_build_object('product_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_low_stock ON public.products;
CREATE TRIGGER notify_low_stock
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_low_stock();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;