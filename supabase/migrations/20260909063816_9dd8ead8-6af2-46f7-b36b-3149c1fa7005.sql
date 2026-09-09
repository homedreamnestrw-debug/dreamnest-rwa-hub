CREATE TYPE public.calendar_event_type AS ENUM ('reminder','task','delivery','invoice','marketing','staff','operations','holiday','customer');
CREATE TYPE public.calendar_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.calendar_event_status AS ENUM ('pending','completed','cancelled');
CREATE TYPE public.calendar_task_status AS ENUM ('todo','in_progress','completed','cancelled');
CREATE TYPE public.calendar_task_category AS ENUM ('marketing','operations','stock','finance','staff','other');
CREATE TYPE public.calendar_recurrence AS ENUM ('daily','weekly','monthly','yearly');

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type public.calendar_event_type NOT NULL DEFAULT 'reminder',
  start_date date NOT NULL,
  end_date date,
  start_time time,
  end_time time,
  all_day boolean NOT NULL DEFAULT true,
  color text NOT NULL DEFAULT '#60432E',
  priority public.calendar_priority NOT NULL DEFAULT 'medium',
  status public.calendar_event_status NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  created_by uuid,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule public.calendar_recurrence,
  recurrence_interval integer NOT NULL DEFAULT 1,
  recurrence_days_of_week integer[] NOT NULL DEFAULT '{}',
  recurrence_count integer,
  recurrence_end_date date,
  linked_entity_type text,
  linked_entity_id uuid,
  reminder_minutes_before integer,
  notes text,
  attachments text[] NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff view own events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid() OR is_system = true));

CREATE POLICY "Staff create events" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'staff') AND created_by = auth.uid());

CREATE POLICY "Staff update own events" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid()));

CREATE POLICY "Staff delete own events" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND created_by = auth.uid());

CREATE TABLE public.calendar_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  due_time time,
  priority public.calendar_priority NOT NULL DEFAULT 'medium',
  status public.calendar_task_status NOT NULL DEFAULT 'todo',
  assigned_to uuid,
  created_by uuid,
  category public.calendar_task_category NOT NULL DEFAULT 'other',
  linked_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule public.calendar_recurrence,
  recurrence_interval integer NOT NULL DEFAULT 1,
  recurrence_end_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_tasks TO authenticated;
GRANT ALL ON public.calendar_tasks TO service_role;
ALTER TABLE public.calendar_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all tasks" ON public.calendar_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff view own tasks" ON public.calendar_tasks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid()));

CREATE POLICY "Staff create tasks" ON public.calendar_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'staff') AND created_by = auth.uid());

CREATE POLICY "Staff update own tasks" ON public.calendar_tasks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'staff') AND (assigned_to = auth.uid() OR created_by = auth.uid()));

CREATE POLICY "Staff delete own tasks" ON public.calendar_tasks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'staff') AND created_by = auth.uid());

CREATE INDEX idx_calendar_events_start ON public.calendar_events (start_date);
CREATE INDEX idx_calendar_events_assigned ON public.calendar_events (assigned_to);
CREATE INDEX idx_calendar_tasks_due ON public.calendar_tasks (due_date);
CREATE INDEX idx_calendar_tasks_assigned ON public.calendar_tasks (assigned_to);

CREATE TRIGGER trg_calendar_events_updated BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_calendar_tasks_updated BEFORE UPDATE ON public.calendar_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();