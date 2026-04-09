
-- Seed categories
INSERT INTO public.categories (id, name, slug, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Bedding', 'bedding', 'Premium bed sheets, duvets, and comforters'),
  ('a1000000-0000-0000-0000-000000000002', 'Pillows', 'pillows', 'Luxury pillows for the perfect sleep'),
  ('a1000000-0000-0000-0000-000000000003', 'Home Decor', 'home-decor', 'Elegant home decoration pieces'),
  ('a1000000-0000-0000-0000-000000000004', 'Bath & Body', 'bath-body', 'Premium bath towels and accessories')
ON CONFLICT DO NOTHING;

-- Seed products
INSERT INTO public.products (name, slug, description, price, cost_price, sku, stock_quantity, low_stock_threshold, category_id, is_active, featured) VALUES
  ('Egyptian Cotton Sheet Set', 'egyptian-cotton-sheet-set', 'Luxurious 400-thread-count Egyptian cotton sheet set. Available in Queen and King sizes.', 85000, 45000, 'BED-001', 25, 5, 'a1000000-0000-0000-0000-000000000001', true, true),
  ('Silk Duvet Cover', 'silk-duvet-cover', 'Pure mulberry silk duvet cover with a satin finish. Hypoallergenic and temperature-regulating.', 120000, 65000, 'BED-002', 15, 3, 'a1000000-0000-0000-0000-000000000001', true, true),
  ('Memory Foam Pillow', 'memory-foam-pillow', 'Ergonomic contour memory foam pillow for optimal neck support.', 35000, 18000, 'PIL-001', 40, 8, 'a1000000-0000-0000-0000-000000000002', true, false),
  ('Goose Down Pillow', 'goose-down-pillow', 'Premium Hungarian goose down pillow, medium firmness.', 55000, 28000, 'PIL-002', 20, 5, 'a1000000-0000-0000-0000-000000000002', true, true),
  ('Scented Candle Set', 'scented-candle-set', 'Set of 3 hand-poured soy candles: Lavender, Vanilla, and Eucalyptus.', 28000, 12000, 'DEC-001', 50, 10, 'a1000000-0000-0000-0000-000000000003', true, false),
  ('Woven Throw Blanket', 'woven-throw-blanket', 'Handwoven cotton throw blanket in earthy tones. Perfect for living rooms.', 45000, 22000, 'DEC-002', 30, 5, 'a1000000-0000-0000-0000-000000000003', true, true),
  ('Turkish Bath Towel Set', 'turkish-bath-towel-set', 'Set of 4 premium Turkish cotton bath towels. Ultra-absorbent and soft.', 65000, 32000, 'BTH-001', 35, 5, 'a1000000-0000-0000-0000-000000000004', true, false),
  ('Bamboo Bath Robe', 'bamboo-bath-robe', 'Eco-friendly bamboo fiber bath robe. Lightweight and luxuriously soft.', 48000, 24000, 'BTH-002', 18, 4, 'a1000000-0000-0000-0000-000000000004', true, false)
ON CONFLICT DO NOTHING;

-- Seed supplier
INSERT INTO public.suppliers (name, contact_person, phone, email, address, payment_terms, notes) VALUES
  ('Kigali Textile Co.', 'Jean-Pierre Habimana', '+250 788 123 456', 'info@kigalitextile.rw', 'KG 15 Ave, Kicukiro, Kigali', 'Net 30', 'Primary supplier for cotton and linen products')
ON CONFLICT DO NOTHING;
