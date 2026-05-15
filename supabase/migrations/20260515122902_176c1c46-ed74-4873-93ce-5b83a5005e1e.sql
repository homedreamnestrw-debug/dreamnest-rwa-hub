-- Backfill products.variant_attributes from existing active product_variants
WITH agg AS (
  SELECT
    pv.product_id,
    jsonb_object_agg(attr_key, attr_values) AS attrs
  FROM (
    SELECT
      pv.product_id,
      kv.key AS attr_key,
      jsonb_agg(DISTINCT kv.value) AS attr_values
    FROM public.product_variants pv,
         LATERAL jsonb_each(COALESCE(pv.attributes, '{}'::jsonb)) kv
    WHERE pv.is_active = true
      AND kv.value IS NOT NULL
      AND kv.value <> 'null'::jsonb
      AND kv.value <> '""'::jsonb
    GROUP BY pv.product_id, kv.key
  ) pv
  GROUP BY pv.product_id
)
UPDATE public.products p
SET variant_attributes = agg.attrs
FROM agg
WHERE p.id = agg.product_id
  AND (p.variant_attributes IS NULL OR p.variant_attributes = '{}'::jsonb);