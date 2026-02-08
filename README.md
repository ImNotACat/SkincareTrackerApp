# Glow - Skincare Routine Tracker

A React Native app built with Expo Router to help you manage your daily skincare routine, track products and ingredients, explore new products, log your skin's progress with photos, and catch ingredient conflicts before they cause problems.

## Features

### Daily Routine
- **Smart Today View** — Week bar at the top shows the current week with today circled; tap any day to view that day's routine log
- **AM/PM Sections** — Morning routine is always listed first; the morning section auto-opens before 1 PM, evening after. Both are independently collapsible
- **Routine Management** — Add, edit, and drag-and-drop reorder skincare steps with 11 categories and flexible scheduling
- **Flexible Scheduling** — Three scheduling modes:
  - **Weekly** — Specific days of the week (e.g., Mon/Wed/Fri)
  - **Cycle** — Repeating N-day rota (e.g., 4-day cycle, active on days 2 and 3)
  - **Interval** — Periodic (e.g., every 3 days)
- **Daily Tracking** — Check off steps as you complete them; progress resets each day
- **Quick Action Cards** — Jump to Explore or Track Progress directly from the homepage

### Product Management
- **Product Library** — Track every product in your routine with brand, category, frequency, and time of day
- **Import from URL** — Paste a product page link to auto-extract name, brand, image, and ingredients via meta tag scraping
- **Active Ingredient Selector** — Searchable multi-select dropdown pre-populated with comprehensive skincare active ingredients, displayed as tags
- **Expiry Tracking** — Track period-after-opening (PAO), purchase date, and open date with automatic expiry calculations
- **Wishlist** — Heart products from the Explore page; view and manage your wishlist in the Products tab

### Explore
- **Product Search** — Search for skincare products using the Open Beauty Facts public API
- **Product Details** — View product names, brands, and images from the database
- **Wishlist Integration** — Tap the heart icon on any product to add/remove it from your wishlist

### Ingredient Conflict Detection
- **11 Curated Conflict Rules** — Covers retinoid + AHA/BHA, retinoid + benzoyl peroxide, multiple retinoids, vitamin C + acids, copper peptides + acids, and more
- **Smart Time Matching** — Only flags conflicts between products used at the same time of day
- **Severity Levels** — High (Avoid), Medium (Caution), and Low (Note) with explanations and actionable suggestions
- **Surfaces Everywhere** — Warnings appear on both the Today screen and individual product detail pages

### Progress Journal
- **Photo Logging** — Take photos or pick from your library to track your skin over time
- **Notes & Observations** — Log comments like "skin peeling", "breakout clearing up", etc.
- **Quick Tags** — One-tap tags for common observations (breakout, redness, glowing, etc.)
- **Timeline View** — Entries grouped by date with expandable full-screen image viewer
- **Supabase Storage Ready** — Schema includes storage bucket setup for cloud photo sync

### Themes
- **Light & Dark Mode** — Toggle between light and dark themes from the Profile page
- **Consistent Styling** — Theme-aware colors applied across all screens and components

### Authentication & Backend
- **Google OAuth** — Skeleton authentication flow using Supabase Auth + Google provider
- **Supabase Backend** — Complete database schema with tables, indexes, triggers, and Row Level Security
- **Guest Mode** — Use the app locally without signing in (all data stored on device via AsyncStorage)

## Tech Stack

- **React Native** with **Expo SDK 54**
- **Expo Router** v6 (file-based routing with tabs + modals)
- **TypeScript** (strict, full type coverage)
- **Supabase** (Auth + PostgreSQL + Storage)
- **AsyncStorage** (local persistence for guest mode)
- **react-native-draglist** (pure JS drag-and-drop reordering)
- **expo-image-picker** (camera + photo library access)
- **Open Beauty Facts API** (product search)

## Date Format

All dates throughout the app use **dd-mm-yyyy** format.

## Project Structure

```
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root stack layout with Auth + Theme providers
│   ├── login.tsx                # Welcome / login screen
│   ├── add-step.tsx             # Add routine step (modal)
│   ├── edit-step.tsx            # Edit routine step (modal)
│   ├── add-product.tsx          # Add product with manual/URL import (modal)
│   ├── edit-product.tsx         # Edit product (modal)
│   ├── product-detail.tsx       # Full product detail view
│   ├── add-entry.tsx            # Add journal entry (modal)
│   └── (tabs)/                  # Tab navigation
│       ├── _layout.tsx          # Tab bar config (6 tabs)
│       ├── index.tsx            # Today — week bar + smart AM/PM routine
│       ├── routine.tsx          # Routine management with drag-and-drop
│       ├── products.tsx         # Product library + wishlist
│       ├── explore.tsx          # Product search via Open Beauty Facts
│       ├── journal.tsx          # Progress journal
│       └── profile.tsx          # Profile, settings & theme toggle
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── ConflictWarnings.tsx # Ingredient conflict warning cards
│   │   ├── EmptyState.tsx       # Empty state placeholder
│   │   ├── IngredientSelector.tsx # Multi-select ingredient dropdown with search
│   │   ├── ProductCard.tsx      # Product list card
│   │   ├── ProgressRing.tsx     # Circular progress indicator
│   │   ├── SectionHeader.tsx    # Section headers with icons
│   │   ├── StepCard.tsx         # Routine step card
│   │   └── WeekBar.tsx          # Scrollable week bar for date selection
│   ├── constants/
│   │   ├── theme.ts             # Colors (light + dark), typography, spacing, radii
│   │   └── skincare.ts          # Categories, days, frequency, active ingredients
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Authentication state provider
│   │   └── ThemeContext.tsx      # Light/dark theme provider
│   ├── hooks/
│   │   ├── useRoutine.ts        # Routine steps + completions + reordering
│   │   ├── useProducts.ts       # Product CRUD + conflict detection
│   │   ├── useJournal.ts        # Journal entries CRUD
│   │   └── useWishlist.ts       # Wishlist management
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client init
│   │   ├── auth.ts              # Google OAuth helpers
│   │   ├── dateUtils.ts         # Centralized dd-mm-yyyy date formatting
│   │   ├── openbeautyfacts.ts   # Open Beauty Facts API client
│   │   ├── product-import.ts    # URL scraping for product data
│   │   └── ingredient-conflicts.ts  # Conflict rules & detection engine
│   └── types/
│       └── index.ts             # All TypeScript type definitions
├── supabase/
│   └── schema.sql               # Full database schema + RLS policies
├── .env.example                 # Environment variable template
├── SETUP.md                     # Detailed setup instructions
├── app.json                     # Expo configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ImNotACat/SkincareTrackerApp.git
cd SkincareTrackerApp

# Install dependencies
npm install

# Start the Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator
npx expo start --ios
```

The app works immediately in **Guest Mode** with local storage. For cloud sync, authentication, and photo storage, follow the full setup guide in [SETUP.md](./SETUP.md).

## Usage

1. **Guest Mode** — Tap "Skip for now" on the welcome screen to use the app with local storage
2. **Add Steps** — Go to the "Routine" tab, tap +, pick a category, time of day, and schedule (weekly days, cycle rota, or interval)
3. **Reorder Steps** — On the Routine tab, press and drag the handle icon to reorder steps
4. **Track Daily** — The "Today" tab auto-shows your current routine; tap checkboxes to mark steps done. Use the week bar to view previous days
5. **Add Products** — In the "Products" tab, tap + to add manually or import from a URL
6. **Explore Products** — Search the Open Beauty Facts database and heart products to add them to your wishlist
7. **Check Conflicts** — Ingredient warnings appear automatically on the Today screen and product detail pages
8. **Log Progress** — In the "Progress" tab, tap + to add a photo or note about your skin
9. **Dark Mode** — Toggle between light and dark themes in the Profile tab

## License

MIT
