
CREATE TABLE public.website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text UNIQUE NOT NULL,
  content_value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view website content"
ON public.website_content FOR SELECT
USING (true);

CREATE POLICY "Admin can manage website content"
ON public.website_content FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_public_website_content()
RETURNS TABLE(content_key text, content_value text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT content_key, content_value FROM public.website_content;
$$;

-- Seed default values
INSERT INTO public.website_content (content_key, content_value) VALUES
  ('hero_subtitle', 'Premium Bedding & Home Decor'),
  ('hero_title', 'Comfort Meets Elegance'),
  ('hero_description', 'Discover handcrafted bedding and decor pieces that transform your home into a sanctuary of warmth and style.'),
  ('feature_1_title', 'Free Delivery in Kigali'),
  ('feature_1_desc', 'On orders above 50,000 RWF'),
  ('feature_2_title', 'Quality Guaranteed'),
  ('feature_2_desc', '30-day return policy'),
  ('feature_3_title', 'Sustainably Made'),
  ('feature_3_desc', 'Eco-friendly materials'),
  ('newsletter_title', 'Stay in the Loop'),
  ('newsletter_desc', 'Subscribe for exclusive offers, new arrivals, and home styling tips.'),
  ('about_title', 'Crafted with Love in Rwanda'),
  ('about_description', 'DreamNest was born from a simple belief — everyone deserves to come home to comfort and beauty. Based in Kigali, we curate premium bedding and home decor pieces that blend artisan craftsmanship with modern elegance.'),
  ('footer_description', 'Premium bedding & home decor, crafted with care in Kigali, Rwanda.');
