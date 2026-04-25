-- Creative Studio: assets log
CREATE TABLE public.creative_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  asset_type text NOT NULL CHECK (asset_type IN ('product_card','announcement','bundle')),
  product_id uuid,
  template_key text,
  style_variant text,
  platform_format text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  caption text,
  download_count integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_creative_assets_created_at ON public.creative_assets(created_at DESC);
CREATE INDEX idx_creative_assets_product ON public.creative_assets(product_id);
CREATE INDEX idx_creative_assets_type ON public.creative_assets(asset_type);

ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can view creative assets"
  ON public.creative_assets FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can insert creative assets"
  ON public.creative_assets FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can update creative assets"
  ON public.creative_assets FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can delete creative assets"
  ON public.creative_assets FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Creative Studio: performance notes
CREATE TABLE public.creative_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  asset_id uuid NOT NULL REFERENCES public.creative_assets(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram','tiktok','facebook','whatsapp')),
  posted_at date,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  sales_attributed integer NOT NULL DEFAULT 0,
  notes text
);

CREATE INDEX idx_creative_perf_asset ON public.creative_performance(asset_id);

ALTER TABLE public.creative_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can view creative performance"
  ON public.creative_performance FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can insert creative performance"
  ON public.creative_performance FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can update creative performance"
  ON public.creative_performance FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can delete creative performance"
  ON public.creative_performance FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));