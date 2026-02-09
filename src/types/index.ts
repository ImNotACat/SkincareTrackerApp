// ─── Skincare Routine Types ─────────────────────────────────────────────────

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TimeOfDay = 'morning' | 'evening';

export type ScheduleType = 'weekly' | 'cycle' | 'interval';

export type StepCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'exfoliant'
  | 'mask'
  | 'eye_cream'
  | 'lip_care'
  | 'treatment'
  | 'other';

export interface RoutineStep {
  id: string;
  user_id: string;
  name: string;
  product_name?: string;
  category: StepCategory;
  time_of_day: TimeOfDay;
  order: number;
  notes?: string;

  // ── Scheduling ────────────────────────────────────────────────────────────
  schedule_type: ScheduleType;

  // Weekly mode — specific days of the week
  days: DayOfWeek[];

  // Cycle mode — repeating N-day rota
  cycle_length?: number;        // total days in the cycle (e.g., 4)
  cycle_days?: number[];        // which days are active, 1-indexed (e.g., [2, 3])
  cycle_start_date?: string;    // YYYY-MM-DD anchor for "day 1"

  // Interval mode — every X days
  interval_days?: number;       // e.g., 3 means every 3rd day
  interval_start_date?: string; // YYYY-MM-DD anchor for the first occurrence

  created_at: string;
  updated_at: string;
}

export type StepCompletionStatus = 'completed' | 'skipped';

export interface CompletedStep {
  id: string;
  user_id: string;
  step_id: string;
  status: StepCompletionStatus;
  product_used?: string; // which product was actually used (if any)
  completed_at: string;
  date: string; // YYYY-MM-DD
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  theme_preference?: 'light' | 'dark';
  created_at: string;
}

// ─── Product Catalog Types (shared across users) ────────────────────────────

export interface CatalogProduct {
  id: string;
  created_by?: string; // user who first added it
  name: string;
  brand?: string;
  size?: string;
  image_url?: string;
  source_url?: string;
  step_category: StepCategory;
  active_ingredients?: string;
  full_ingredients?: string;
  times_added: number; // popularity counter
  created_at: string;
  updated_at: string;
}

// ─── Product Types (user-specific) ──────────────────────────────────────────

export type TimeOfDayUsage = 'morning' | 'evening' | 'both';

export interface Product {
  id: string;
  user_id: string;
  catalog_id?: string; // link to shared product_catalog entry

  // Core info
  name: string;
  brand?: string;
  size?: string; // e.g., "100ml", "50g", "1.7 oz"
  image_url?: string;
  source_url?: string; // URL product was imported from

  // Routine placement
  step_category: StepCategory;
  time_of_day: TimeOfDayUsage;
  times_per_week: number; // 1-7

  // Ingredients
  active_ingredients?: string; // comma-separated key actives
  full_ingredients?: string; // full INCI list

  // Longevity & dates
  longevity_months?: number; // PAO (period after opening) in months
  date_purchased?: string; // YYYY-MM-DD
  date_opened?: string; // YYYY-MM-DD

  // Usage
  notes?: string;
  started_at: string; // YYYY-MM-DD — when added to routine
  stopped_at?: string; // YYYY-MM-DD — undefined = still active

  // Scheduling: supports weekly, cycle (repeating N-day rota), or interval (every X days)
  schedule_type?: ScheduleType;
  schedule_days?: DayOfWeek[];               // For weekly: days of week
  schedule_cycle_length?: number;            // For cycle: total days in cycle
  schedule_cycle_days?: number[];            // For cycle: 1-indexed active days
  schedule_cycle_start_date?: string;        // For cycle: anchor date (YYYY-MM-DD)
  schedule_interval_days?: number;           // For interval: every X days
  schedule_interval_start_date?: string;     // For interval: anchor date (YYYY-MM-DD)

  created_at: string;
  updated_at: string;
}

/** Data that can be auto-extracted from a product URL */
export interface ImportedProductData {
  name?: string;
  brand?: string;
  size?: string;
  image_url?: string;
  description?: string;
  ingredients?: string;
  active_ingredients?: string[];
  step_category?: StepCategory;
  source_url: string;
}

// ─── Journal / Progress Types ────────────────────────────────────────────────

export type JournalEntryType = 'comment' | 'photo';

export interface JournalEntry {
  id: string;
  user_id: string;
  type: JournalEntryType;
  text?: string; // comment text or caption
  image_uri?: string; // local URI for now, Supabase storage URL later
  created_at: string;
}

// ─── Product Comment Types ──────────────────────────────────────────────

export interface ProductComment {
  id: string;
  user_id: string;
  product_id: string;
  text: string;
  created_at: string;
}

// ─── UI State Types ─────────────────────────────────────────────────────────

export interface TodayStep extends RoutineStep {
  isCompleted: boolean;
  isSkipped: boolean;
  productUsed?: string;
}

export type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
};

// ─── Wishlist Types ───────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id?: string; // External product ID (e.g., from Open Beauty Facts)
  product_name: string;
  brand?: string;
  image_url?: string;
  source_url?: string;
  created_at: string;
}
