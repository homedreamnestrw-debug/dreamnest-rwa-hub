INSERT INTO public.categories (name, slug, description) VALUES
  ('Bedding', 'bedding', 'Core sleep essentials — bedsheets, duvets, pillows, and mattress toppers.'),
  ('Throws & Cushions', 'throws-cushions', 'Decorative soft layers that add warmth and style.'),
  ('Bath & Body', 'bath-body', 'Everything for the bathroom and personal care.'),
  ('Storage & Organization', 'storage-organization', 'Tidy-up essentials for bedroom, bathroom, and laundry.')
ON CONFLICT (slug) DO NOTHING;