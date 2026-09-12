-- lovable-cron-fallback-reviewed: 288 runs/day; reminders support a 15-minutes-before option, so a coarser cadence would deliver them late
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS reminder_notified_at timestamptz;
ALTER TABLE public.calendar_tasks ADD COLUMN IF NOT EXISTS reminder_notified_at timestamptz;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.dispatch_calendar_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  due_at timestamptz;
  lead_min integer;
BEGIN
  FOR r IN
    SELECT id, title, start_date, start_time, all_day, priority, assigned_to,
           reminder_minutes_before
    FROM public.calendar_events
    WHERE status = 'pending'
      AND reminder_notified_at IS NULL
      AND start_date BETWEEN (now() AT TIME ZONE 'Africa/Kigali')::date - 1
                         AND (now() AT TIME ZONE 'Africa/Kigali')::date + 3
  LOOP
    due_at := ((r.start_date::text || ' ' || COALESCE(
                 CASE WHEN r.all_day THEN '08:00' ELSE r.start_time::text END, '08:00'))
               ::timestamp) AT TIME ZONE 'Africa/Kigali';
    lead_min := COALESCE(r.reminder_minutes_before, 60);
    IF now() >= due_at - make_interval(mins => lead_min) AND now() <= due_at + interval '1 day' THEN
      INSERT INTO public.notifications (audience, user_id, type, title, body, link, metadata)
      VALUES (
        CASE WHEN r.assigned_to IS NULL THEN 'staff' ELSE 'user' END,
        r.assigned_to,
        'calendar',
        'Reminder: ' || r.title,
        'Scheduled for ' || to_char(due_at AT TIME ZONE 'Africa/Kigali', 'Dy DD Mon HH24:MI')
          || ' (' || r.priority::text || ' priority)',
        '/admin/calendar',
        jsonb_build_object('event_id', r.id)
      );
      UPDATE public.calendar_events SET reminder_notified_at = now() WHERE id = r.id;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id, title, due_date, due_time, priority, assigned_to
    FROM public.calendar_tasks
    WHERE status IN ('todo', 'in_progress')
      AND reminder_notified_at IS NULL
      AND due_date IS NOT NULL
      AND due_date BETWEEN (now() AT TIME ZONE 'Africa/Kigali')::date - 1
                       AND (now() AT TIME ZONE 'Africa/Kigali')::date + 3
  LOOP
    due_at := ((r.due_date::text || ' ' || COALESCE(r.due_time::text, '17:00'))::timestamp)
              AT TIME ZONE 'Africa/Kigali';
    IF now() >= due_at - interval '60 minutes' AND now() <= due_at + interval '1 day' THEN
      INSERT INTO public.notifications (audience, user_id, type, title, body, link, metadata)
      VALUES (
        CASE WHEN r.assigned_to IS NULL THEN 'staff' ELSE 'user' END,
        r.assigned_to,
        'calendar',
        'Task due: ' || r.title,
        'Due ' || to_char(due_at AT TIME ZONE 'Africa/Kigali', 'Dy DD Mon HH24:MI')
          || ' (' || r.priority::text || ' priority)',
        '/admin/calendar',
        jsonb_build_object('task_id', r.id)
      );
      UPDATE public.calendar_tasks SET reminder_notified_at = now() WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_calendar_reminders() FROM anon, authenticated;

SELECT cron.unschedule('calendar-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calendar-reminders');

SELECT cron.schedule('calendar-reminders', '*/5 * * * *', $$SELECT public.dispatch_calendar_reminders();$$);