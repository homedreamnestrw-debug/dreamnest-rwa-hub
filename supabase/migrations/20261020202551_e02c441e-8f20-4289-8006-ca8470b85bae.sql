DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions FOR INSERT TO anon, authenticated
WITH CHECK (is_read = false AND length(name) BETWEEN 1 AND 200 AND length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(message) BETWEEN 1 AND 5000 AND coalesce(length(subject),0) <= 300 AND coalesce(length(phone),0) <= 50);

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

DROP POLICY IF EXISTS "Anyone can insert auth log entries" ON public.auth_logs;
CREATE POLICY "Anyone can insert auth log entries" ON public.auth_logs FOR INSERT TO anon, authenticated
WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(action) BETWEEN 1 AND 64 AND coalesce(length(email),0) <= 255);