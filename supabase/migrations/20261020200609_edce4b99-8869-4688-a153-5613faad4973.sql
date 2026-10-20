CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dispatch_zero_sales_check()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE day_start timestamptz := ((now() AT TIME ZONE 'Africa/Kigali')::date)::timestamp AT TIME ZONE 'Africa/Kigali';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE created_at >= day_start AND status <> 'cancelled') THEN
    PERFORM public.notify_staff('sales_check', 'No sales recorded today',
      'No orders or POS sales were logged today. Were there any sales? Please record them now.',
      '/admin/pos', jsonb_build_object('date', (now() AT TIME ZONE 'Africa/Kigali')::date));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_plan_prompt(_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind = 'monthly' THEN
    PERFORM public.notify_staff('planning', 'New month: record your monthly plan',
      'Welcome to ' || to_char(now() AT TIME ZONE 'Africa/Kigali','FMMonth') || '! Set targets, promotions, stock audits and key dates in the calendar.',
      '/admin/calendar', '{"kind":"monthly"}'::jsonb);
  ELSE
    PERFORM public.notify_staff('planning', 'New week: record your weekly plan',
      'Good morning! Review pending tasks and add this week''s priorities to the calendar.',
      '/admin/calendar', '{"kind":"weekly"}'::jsonb);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.dispatch_zero_sales_check() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_plan_prompt(text) FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('zero-sales-check','weekly-plan-prompt','monthly-plan-prompt','business-digest');

SELECT cron.schedule('zero-sales-check', '30 18 * * *', $$SELECT public.dispatch_zero_sales_check();$$);
SELECT cron.schedule('weekly-plan-prompt', '0 7 * * 1', $$SELECT public.dispatch_plan_prompt('weekly');$$);
SELECT cron.schedule('monthly-plan-prompt', '0 7 1 * *', $$SELECT public.dispatch_plan_prompt('monthly');$$);
SELECT cron.schedule('business-digest', '0 19 * * *', $$
  SELECT net.http_post(
    url := 'https://mreuawvrjanwcolbathu.supabase.co/functions/v1/business-digest',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret','8afc3b92bf20e71da104e69997f0481d1b9836773b2e84af'),
    body := '{}'::jsonb);
$$);