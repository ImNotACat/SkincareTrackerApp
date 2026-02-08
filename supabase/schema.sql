-- ============================================================================
-- Glow Skincare Tracker - Supabase Database Schema
-- ============================================================================
-- Run this in the Supabase SQL Editor to set up your database tables.
-- This script is idempotent — safe to run multiple times.
-- Dashboard: https://app.supabase.com → SQL Editor

-- ─── Profiles ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'pink', 'teal')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automatically create a profile when a new user signs up.
-- Uses ON CONFLICT so re-runs are safe, and EXCEPTION so a trigger
-- failure never blocks user creation in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, theme_preference)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url',
    'light'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but never block user creation
  RAISE LOG 'handle_new_user trigger failed: % (state %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Routine Steps ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_name TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen',
    'exfoliant', 'mask', 'eye_cream', 'lip_care', 'treatment', 'other'
  )),
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'evening')),
  "order" INTEGER NOT NULL DEFAULT 0,
  notes TEXT,

  -- Scheduling: supports weekly, cycle (repeating N-day rota), or interval (every X days)
  schedule_type TEXT NOT NULL DEFAULT 'weekly'
    CHECK (schedule_type IN ('weekly', 'cycle', 'interval')),

  -- Weekly mode: specific days of the week
  days TEXT[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],

  -- Cycle mode: repeating N-day rota (e.g., 4-day cycle, active on days 2 and 3)
  cycle_length INTEGER CHECK (cycle_length > 0),
  cycle_days INTEGER[],            -- 1-indexed active days within the cycle
  cycle_start_date DATE,           -- anchor: when "day 1" started

  -- Interval mode: every X days (e.g., every 3 days)
  interval_days INTEGER CHECK (interval_days > 0),
  interval_start_date DATE,        -- anchor: the first occurrence

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routine_steps_user ON routine_steps(user_id);

-- ─── Completed Steps ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS completed_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES routine_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'skipped')),
  product_used TEXT,             -- which product was actually used for this step
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_completed_steps_user_date ON completed_steps(user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_completed_steps_unique ON completed_steps(user_id, step_id, date);

-- ─── Products ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core info
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  source_url TEXT,

  -- Routine placement
  step_category TEXT NOT NULL CHECK (step_category IN (
    'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen',
    'exfoliant', 'mask', 'eye_cream', 'lip_care', 'treatment', 'other'
  )),
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'evening', 'both')),
  times_per_week INTEGER NOT NULL DEFAULT 7 CHECK (times_per_week BETWEEN 1 AND 7),

  -- Ingredients
  active_ingredients TEXT,
  full_ingredients TEXT,

  -- Longevity & dates
  longevity_months INTEGER CHECK (longevity_months > 0),
  date_purchased DATE,
  date_opened DATE,

  -- Usage
  notes TEXT,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  stopped_at DATE,

  -- Scheduling: supports weekly, cycle (repeating N-day rota), or interval (every X days)
  schedule_type TEXT CHECK (schedule_type IN ('weekly', 'cycle', 'interval')),
  schedule_days TEXT[],                    -- For weekly: days of week
  schedule_cycle_length INTEGER,           -- For cycle: total days in cycle
  schedule_cycle_days INTEGER[],           -- For cycle: 1-indexed active days
  schedule_cycle_start_date DATE,          -- For cycle: anchor date
  schedule_interval_days INTEGER,          -- For interval: every X days
  schedule_interval_start_date DATE,       -- For interval: anchor date

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(user_id) WHERE stopped_at IS NULL;

-- ─── Journal Entries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'photo')),
  text TEXT,
  image_url TEXT, -- Supabase Storage URL (bucket: journal-photos)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(user_id, created_at DESC);

-- ─── Wishlist ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT,                         -- External product ID (e.g., from Open Beauty Facts)
  product_name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- ─── Supabase Storage Bucket for Journal Photos ────────────────────────────
-- Run this in the SQL Editor or create via the Supabase Dashboard → Storage.
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('journal-photos', 'journal-photos', false);
--
-- CREATE POLICY "Users can upload own journal photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own journal photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own journal photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Routine Steps: users can CRUD their own steps
DROP POLICY IF EXISTS "Users can view own steps" ON routine_steps;
CREATE POLICY "Users can view own steps"
  ON routine_steps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own steps" ON routine_steps;
CREATE POLICY "Users can insert own steps"
  ON routine_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own steps" ON routine_steps;
CREATE POLICY "Users can update own steps"
  ON routine_steps FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own steps" ON routine_steps;
CREATE POLICY "Users can delete own steps"
  ON routine_steps FOR DELETE
  USING (auth.uid() = user_id);

-- Products: users can CRUD their own products
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Completed Steps: users can CRUD their own completions
DROP POLICY IF EXISTS "Users can view own completions" ON completed_steps;
CREATE POLICY "Users can view own completions"
  ON completed_steps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own completions" ON completed_steps;
CREATE POLICY "Users can insert own completions"
  ON completed_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own completions" ON completed_steps;
CREATE POLICY "Users can delete own completions"
  ON completed_steps FOR DELETE
  USING (auth.uid() = user_id);

-- Journal Entries: users can CRUD their own entries
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;
CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;
CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Wishlist: users can CRUD their own wishlist items
DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlist;
CREATE POLICY "Users can view own wishlist"
  ON wishlist FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wishlist items" ON wishlist;
CREATE POLICY "Users can insert own wishlist items"
  ON wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wishlist items" ON wishlist;
CREATE POLICY "Users can delete own wishlist items"
  ON wishlist FOR DELETE
  USING (auth.uid() = user_id);
