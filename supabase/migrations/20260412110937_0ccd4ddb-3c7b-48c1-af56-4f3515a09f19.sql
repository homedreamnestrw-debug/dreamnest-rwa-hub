INSERT INTO public.website_content (content_key, content_value) VALUES
  ('contact_label_visit', 'Visit Us'),
  ('contact_label_call', 'Call Us'),
  ('contact_label_email', 'Email Us')
ON CONFLICT (content_key) DO NOTHING;