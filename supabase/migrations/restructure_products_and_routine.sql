-- Restructure products (slim to user instance + catalog link) and link routine_steps to products.
-- Run in Supabase SQL Editor. Order: add columns, then drop columns.

-- ─── 0. routine_steps: ensure time_of_day allows 'both' ────────────────────────
ALTER TABLE routine_steps DROP CONSTRAINT IF EXISTS routine_steps_time_of_day_check;
ALTER TABLE routine_steps ADD CONSTRAINT routine_steps_time_of_day_check
  CHECK (time_of_day IN ('morning', 'evening', 'both'));

-- ─── 1. routine_steps: add product_id ────────────────────────────────────────
ALTER TABLE routine_steps
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_routine_steps_product ON routine_steps(product_id);

-- ─── 2. products: make name nullable (for catalog-linked rows) ──────────────
ALTER TABLE products ALTER COLUMN name DROP NOT NULL;
ALTER TABLE products ALTER COLUMN step_category DROP NOT NULL;

-- ─── 3. products: drop schedule columns ─────────────────────────────────────
ALTER TABLE products DROP COLUMN IF EXISTS time_of_day;
ALTER TABLE products DROP COLUMN IF EXISTS times_per_week;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_type;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_days;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_cycle_length;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_cycle_days;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_cycle_start_date;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_interval_days;
ALTER TABLE products DROP COLUMN IF EXISTS schedule_interval_start_date;

-- ─── 4. products: drop columns that live only in catalog (keep name, brand, image_url, step_category as overrides) ─
ALTER TABLE products DROP COLUMN IF EXISTS size;
ALTER TABLE products DROP COLUMN IF EXISTS source_url;
ALTER TABLE products DROP COLUMN IF EXISTS active_ingredients;
ALTER TABLE products DROP COLUMN IF EXISTS full_ingredients;

-- ─── 5. products: either catalog_id or name must be set (custom product) ────
ALTER TABLE products ADD CONSTRAINT products_catalog_or_name_check
  CHECK (catalog_id IS NOT NULL OR (name IS NOT NULL AND name <> ''));
