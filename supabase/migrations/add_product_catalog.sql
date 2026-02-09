-- Migration: Add shared product catalog
-- Run this in Supabase SQL Editor to add the product catalog feature
-- to an existing database.

-- ─── 1. Create the product_catalog table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  size TEXT,
  image_url TEXT,
  source_url TEXT,
  step_category TEXT NOT NULL CHECK (step_category IN (
    'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen',
    'exfoliant', 'mask', 'eye_cream', 'lip_care', 'treatment', 'other'
  )),
  active_ingredients TEXT,
  full_ingredients TEXT,
  times_added INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_catalog_name ON product_catalog USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_product_catalog_brand ON product_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_product_catalog_category ON product_catalog(step_category);
CREATE INDEX IF NOT EXISTS idx_product_catalog_popular ON product_catalog(times_added DESC);

-- ─── 2. Add missing columns to existing products table ─────────────────────

ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES product_catalog(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_catalog ON products(catalog_id);

-- ─── 3. Enable RLS on product_catalog ───────────────────────────────────────

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view catalog products" ON product_catalog;
CREATE POLICY "Anyone can view catalog products"
  ON product_catalog FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can add to catalog" ON product_catalog;
CREATE POLICY "Authenticated users can add to catalog"
  ON product_catalog FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Creator can update catalog product" ON product_catalog;
CREATE POLICY "Creator can update catalog product"
  ON product_catalog FOR UPDATE
  USING (auth.uid() = created_by);

-- ─── 4. Backfill: add existing products to catalog ─────────────────────────
-- This inserts unique name+brand combinations from existing products into the catalog.
-- Run this once after the migration.

INSERT INTO product_catalog (name, brand, size, image_url, source_url, step_category, active_ingredients, full_ingredients, created_by, times_added)
SELECT DISTINCT ON (LOWER(TRIM(p.name)), LOWER(COALESCE(TRIM(p.brand), '')))
  TRIM(p.name),
  TRIM(p.brand),
  p.size,
  p.image_url,
  p.source_url,
  p.step_category,
  p.active_ingredients,
  p.full_ingredients,
  p.user_id,
  (SELECT COUNT(*) FROM products p2
   WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
     AND LOWER(COALESCE(TRIM(p2.brand), '')) = LOWER(COALESCE(TRIM(p.brand), '')))
FROM products p
ON CONFLICT DO NOTHING;

-- Link existing products to their catalog entries
UPDATE products p
SET catalog_id = pc.id
FROM product_catalog pc
WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(pc.name))
  AND LOWER(COALESCE(TRIM(p.brand), '')) = LOWER(COALESCE(TRIM(pc.brand), ''))
  AND p.catalog_id IS NULL;
