INSERT INTO public.website_content (content_key, content_value) VALUES
  ('contact_title', 'Get in Touch'),
  ('contact_description', 'We''d love to hear from you. Reach out with any questions about our products or orders.'),
  ('contact_address', 'KG 1 Avenue 31, Stone Road From Kisimenti to Sonatube, Kigali, Rwanda'),
  ('contact_phone', '+250 788 742 122'),
  ('contact_email', 'sales@dreamnestrw.com')
ON CONFLICT (content_key) DO NOTHING;