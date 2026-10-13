CREATE OR REPLACE FUNCTION public.tg_calendar_invoice_due() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.calendar_events WHERE is_system AND linked_entity_type='invoice' AND linked_entity_id=NEW.id;
  IF NEW.due_date IS NOT NULL AND NEW.status NOT IN ('paid','cancelled') THEN
    INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, linked_entity_type, linked_entity_id, is_recurring, recurrence_interval, recurrence_days_of_week, attachments)
    VALUES ('Invoice due: ' || NEW.document_number || COALESCE(' – ' || NEW.client_name,''), 'invoice', NEW.due_date, true, '#B45309', 'high', 'pending', true, 'invoice', NEW.id, false, 1, '{}', '{}');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_calendar_invoice_due AFTER INSERT OR UPDATE OF due_date, status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_calendar_invoice_due();

CREATE OR REPLACE FUNCTION public.tg_calendar_po_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.calendar_events WHERE is_system AND linked_entity_type='purchase_order' AND linked_entity_id=NEW.id;
  IF NEW.expected_delivery IS NOT NULL AND NEW.status NOT IN ('received','cancelled') THEN
    INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, linked_entity_type, linked_entity_id, is_recurring, recurrence_interval, recurrence_days_of_week, attachments)
    VALUES ('Delivery expected: ' || NEW.po_number, 'delivery', NEW.expected_delivery, true, '#2563EB', 'medium', 'pending', true, 'purchase_order', NEW.id, false, 1, '{}', '{}');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_calendar_po_delivery AFTER INSERT OR UPDATE OF expected_delivery, status ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.tg_calendar_po_delivery();

CREATE OR REPLACE FUNCTION public.tg_calendar_low_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.low_stock_threshold AND OLD.stock_quantity > OLD.low_stock_threshold THEN
    INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, linked_entity_type, linked_entity_id, is_recurring, recurrence_interval, recurrence_days_of_week, attachments, notes)
    VALUES ('Restock: ' || NEW.name, 'operations', (now() AT TIME ZONE 'Africa/Kigali')::date, true, '#DC2626', 'high', 'pending', true, 'product', NEW.id, false, 1, '{}', '{}', 'Only ' || NEW.stock_quantity || ' left');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_calendar_low_stock AFTER UPDATE OF stock_quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_calendar_low_stock();

REVOKE EXECUTE ON FUNCTION public.tg_calendar_invoice_due(), public.tg_calendar_po_delivery(), public.tg_calendar_low_stock() FROM PUBLIC, anon, authenticated;

-- Backfill existing open invoices / POs
INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, linked_entity_type, linked_entity_id, is_recurring, recurrence_interval, recurrence_days_of_week, attachments)
SELECT 'Invoice due: ' || document_number || COALESCE(' – ' || client_name,''), 'invoice', due_date, true, '#B45309', 'high', 'pending', true, 'invoice', id, false, 1, '{}', '{}'
FROM public.invoices WHERE due_date IS NOT NULL AND status NOT IN ('paid','cancelled');
INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, linked_entity_type, linked_entity_id, is_recurring, recurrence_interval, recurrence_days_of_week, attachments)
SELECT 'Delivery expected: ' || po_number, 'delivery', expected_delivery, true, '#2563EB', 'medium', 'pending', true, 'purchase_order', id, false, 1, '{}', '{}'
FROM public.purchase_orders WHERE expected_delivery IS NOT NULL AND status NOT IN ('received','cancelled');

-- Recurring business reminders
INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, is_recurring, recurrence_rule, recurrence_interval, recurrence_days_of_week, attachments, reminder_minutes_before) VALUES
('Monthly sales review','reminder','2026-11-01',true,'#7C3AED','medium','pending',true,true,'monthly',1,'{}','{}',1440),
('Pay staff salaries','staff','2026-10-25',true,'#059669','high','pending',true,true,'monthly',1,'{}','{}',1440),
('Quarterly RDB / RRA filing','operations','2026-10-15',true,'#B45309','high','pending',true,true,'monthly',3,'{}','{}',2880),
('Annual trading licence & audit','operations','2027-01-15',true,'#B45309','urgent','pending',true,true,'yearly',1,'{}','{}',10080);

-- Rwanda public holidays (recurring yearly fixed-date)
INSERT INTO public.calendar_events (title, event_type, start_date, all_day, color, priority, status, is_system, is_recurring, recurrence_rule, recurrence_interval, recurrence_days_of_week, attachments, notes) VALUES
('New Year''s Day','holiday','2027-01-01',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Day after New Year','holiday','2027-01-02',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('National Heroes'' Day','holiday','2027-02-01',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Genocide against the Tutsi Memorial Day','holiday','2027-04-07',true,'#111827','high','pending',true,true,'yearly',1,'{}','{}','NO PROMOTIONS – remembrance period (Kwibuka). Pause marketing posts and sales campaigns.'),
('Labour Day','holiday','2027-05-01',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Independence Day','holiday','2027-07-01',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Liberation Day','holiday','2027-07-04',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Assumption Day','holiday','2027-08-15',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Christmas Day','holiday','2026-12-25',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Boxing Day','holiday','2026-12-26',true,'#6B7280','low','pending',true,true,'yearly',1,'{}','{}',NULL),
('Umuganura (Harvest Day)','holiday','2027-08-06',true,'#6B7280','low','pending',true,false,NULL,1,'{}','{}','First Friday of August – check date each year'),
('Good Friday','holiday','2027-03-26',true,'#6B7280','low','pending',true,false,NULL,1,'{}','{}',NULL),
('Easter Monday','holiday','2027-03-29',true,'#6B7280','low','pending',true,false,NULL,1,'{}','{}',NULL);