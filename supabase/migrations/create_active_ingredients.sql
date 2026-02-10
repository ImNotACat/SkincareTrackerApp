-- Active ingredients reference table (name, benefits, side effects, interactions, description).
-- Populate manually via Supabase dashboard or API. Used by the app for the ingredient selector.

CREATE TABLE IF NOT EXISTS active_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT,
  benefits TEXT,
  side_effects TEXT,
  risky_interactions TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_ingredients_name ON active_ingredients(name);
CREATE INDEX IF NOT EXISTS idx_active_ingredients_section ON active_ingredients(section);

-- Allow read for all (anon + authenticated) so the app can load the list
ALTER TABLE active_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active ingredients" ON active_ingredients;
CREATE POLICY "Anyone can read active ingredients"
  ON active_ingredients FOR SELECT
  USING (true);

-- Only service role / dashboard can insert/update/delete (no policy = no public write)
-- Add a policy here if you want authenticated users to manage ingredients later:
-- CREATE POLICY "Authenticated users can manage active ingredients"
--   ON active_ingredients FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE active_ingredients IS 'Reference list of active ingredients for product forms. Populate via dashboard.';
