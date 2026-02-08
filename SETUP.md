# Glow - Full Setup Guide

This guide walks you through everything needed to run the app locally and (optionally) connect it to Supabase for cloud sync, authentication, and photo storage.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install & Run Locally](#2-install--run-locally)
3. [Supabase Project Setup](#3-supabase-project-setup)
4. [Run the Database Schema](#4-run-the-database-schema)
5. [Set Up Photo Storage](#5-set-up-photo-storage)
6. [Google OAuth Setup](#6-google-oauth-setup)
7. [Connect Supabase to Google Auth](#7-connect-supabase-to-google-auth)
8. [Configure Environment Variables](#8-configure-environment-variables)
9. [Verify Everything Works](#9-verify-everything-works)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Comes with Node.js |
| **Expo CLI** | Latest | `npx expo` (no global install needed) |
| **Android Studio** | Latest | [developer.android.com/studio](https://developer.android.com/studio) — needed for the Android emulator |
| **Xcode** (macOS only) | 15+ | Mac App Store — needed for the iOS simulator |

> **Note:** You do NOT need a Supabase account to run the app. Guest mode works entirely with on-device storage.

---

## 2. Install & Run Locally

```bash
# Clone the repository
git clone https://github.com/ImNotACat/SkincareTrackerApp.git
cd SkincareTrackerApp

# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

From the Expo dev server menu:
- Press **`a`** to open on an Android emulator
- Press **`i`** to open on an iOS simulator (macOS only)
- Scan the QR code with **Expo Go** on a physical device

The app is fully functional in **Guest Mode** at this point — all data is stored locally on the device using AsyncStorage.

---

## 3. Supabase Project Setup

Follow these steps to enable cloud sync and authentication.

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **"New Project"**
3. Choose an organization (or create one)
4. Fill in:
   - **Project name:** `glow-skincare` (or whatever you prefer)
   - **Database password:** Choose a strong password and save it somewhere safe
   - **Region:** Pick the closest region to you
5. Click **"Create new project"** and wait for it to provision (~2 minutes)

### 3.2 Get Your API Credentials

Once the project is ready:

1. Go to **Settings** (gear icon) → **API**
2. Copy these two values — you'll need them later:

| Value | Where to find it |
|-------|-------------------|
| **Project URL** | Under "Project URL" — looks like `https://abcdefgh.supabase.co` |
| **Anon public key** | Under "Project API keys" → `anon` `public` — a long `eyJ...` string |

> **Important:** The `anon` key is safe to embed in client apps. Never expose the `service_role` key.

---

## 4. Run the Database Schema

The schema file creates all the tables, indexes, triggers, and Row Level Security policies the app needs.

### 4.1 Open the SQL Editor

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **"New query"**

### 4.2 Paste and Run the Schema

1. Open the file `supabase/schema.sql` from this project
2. Copy the **entire** contents of the file
3. Paste it into the SQL Editor
4. Click **"Run"** (or press Ctrl/Cmd + Enter)

You should see a success message. If you get errors, see [Troubleshooting](#10-troubleshooting).

### 4.3 Verify the Tables

After running the schema, go to **Table Editor** in the left sidebar. You should see these tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with theme preference (auto-created on signup via trigger) |
| `routine_steps` | Skincare routine steps with categories, scheduling (weekly/cycle/interval), and ordering |
| `completed_steps` | Daily completion records |
| `products` | Product library with active ingredients, PAO, and dates |
| `journal_entries` | Progress journal notes and photo references |
| `wishlist` | Saved products from the Explore search |

### 4.4 Verify Row Level Security

Go to **Authentication** → **Policies** (or check each table in **Table Editor** → click the table → **RLS** tab). Each table should show:
- RLS is **enabled**
- Policies exist for SELECT, INSERT, UPDATE, and/or DELETE scoped to `auth.uid() = user_id`

This ensures users can only access their own data.

---

## 5. Set Up Photo Storage

The progress journal supports photo uploads. To store them in Supabase:

### 5.1 Create the Storage Bucket

**Option A: Via the Dashboard**

1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Enter:
   - **Name:** `journal-photos`
   - **Public:** Leave **unchecked** (private bucket)
4. Click **"Create bucket"**

**Option B: Via SQL**

Open the SQL Editor and run:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-photos', 'journal-photos', false);
```

### 5.2 Add Storage Policies

Still in the SQL Editor, run these policies to ensure users can only access their own photos:

```sql
-- Users can upload photos to their own folder
CREATE POLICY "Users can upload own journal photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own photos
CREATE POLICY "Users can view own journal photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own journal photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'journal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

> **How it works:** Photos are uploaded to a path like `journal-photos/{user_id}/{filename}`. The policies use `storage.foldername()` to verify the first folder segment matches the authenticated user's ID.

---

## 6. Google OAuth Setup

### 6.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top → **"New Project"**
3. Name it (e.g., `glow-skincare`) and click **"Create"**
4. Make sure the new project is selected in the dropdown

### 6.2 Configure the OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** user type → click **"Create"**
3. Fill in:
   - **App name:** `Glow Skincare Tracker`
   - **User support email:** Your email
   - **Developer contact email:** Your email
4. Click **"Save and Continue"** through the remaining steps (Scopes, Test Users)
5. Click **"Back to Dashboard"**

### 6.3 Create OAuth 2.0 Credentials

Go to **APIs & Services** → **Credentials** → **"Create Credentials"** → **"OAuth client ID"**

You need to create **two** client IDs:

#### Web Client (required by Supabase)

1. Application type: **Web application**
2. Name: `Glow Web Client`
3. **Authorized redirect URIs** — add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your Supabase project reference (the subdomain from your Project URL).
4. Click **"Create"**
5. Copy the **Client ID** and **Client Secret** — you'll need both

#### Android Client

1. Application type: **Android**
2. Name: `Glow Android Client`
3. **Package name:** `com.glow.skincaretracker`
4. **SHA-1 certificate fingerprint** — to get this:

   **For debug builds (Expo Go / development):**
   ```bash
   # macOS / Linux
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep SHA1

   # Windows
   keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr SHA1
   ```

   **For production builds (EAS Build):**
   ```bash
   # If using EAS, get the fingerprint from:
   eas credentials --platform android
   ```

5. Click **"Create"**
6. Copy the **Client ID**

> **Tip:** If you're just developing locally with Expo Go, you only need the debug SHA-1. Add the production SHA-1 later when you're ready to build a release.

---

## 7. Connect Supabase to Google Auth

1. In the Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to expand it
3. Toggle it **ON**
4. Fill in:
   - **Client ID:** The **Web Client** ID from step 6.3
   - **Client Secret:** The **Web Client** secret from step 6.3
5. Click **"Save"**

---

## 8. Configure Environment Variables

### 8.1 Create Your .env File

```bash
cp .env.example .env
```

### 8.2 Fill In Your Values

Open `.env` and replace the placeholders:

```env
# Supabase — from step 3.2
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth — from step 6.3
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-def.apps.googleusercontent.com
```

### 8.3 Restart the Dev Server

After changing `.env`, you must restart Expo:

```bash
# Stop the current server (Ctrl+C), then:
npx expo start --clear
```

The `--clear` flag ensures the Metro bundler picks up the new environment variables.

---

## 9. Verify Everything Works

### Database

1. Open the app and sign in with Google
2. After signing in, check the Supabase **Table Editor** → `profiles` table
3. You should see a new row with your Google email and display name

### Authentication

1. Tap **"Continue with Google"** on the welcome screen
2. Complete the Google sign-in flow
3. You should be redirected back to the app and see the Today screen
4. Check the **Profile** tab — it should show your name and email

### Storage (Journal Photos)

1. Go to the **Progress** tab → tap +
2. Select "Photo" and take/choose a photo
3. In the Supabase dashboard → **Storage** → `journal-photos` bucket
4. You should see the uploaded image in a folder named after your user ID

> **Note:** In guest mode, photos are stored as local file URIs on the device. Cloud upload only works when authenticated with Supabase.

---

## 10. Troubleshooting

### "relation 'profiles' already exists"

This means you've already run the schema. The `CREATE TABLE IF NOT EXISTS` statements should handle this gracefully, but if you need a clean slate:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS completed_steps CASCADE;
DROP TABLE IF EXISTS routine_steps CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
```

Then re-run the full schema.

### Google OAuth redirect not working

- Double-check the redirect URI in Google Cloud Console matches exactly:
  `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Make sure the Google provider is enabled in Supabase → Authentication → Providers
- Verify the Web Client ID and Secret are entered correctly in Supabase
- Ensure `scheme: 'glow-skincare'` is set in `app.json` (it is by default)

### "Invalid API key" or Supabase connection errors

- Verify `EXPO_PUBLIC_SUPABASE_URL` is the full URL including `https://`
- Verify `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the `anon` `public` key, not the `service_role` key
- Restart the dev server with `npx expo start --clear` after changing `.env`

### Photos not uploading to Storage

- Verify the `journal-photos` bucket exists in Supabase → Storage
- Verify the storage policies were created (step 5.2)
- Make sure you're signed in (not in guest mode) — cloud storage requires authentication

### Android emulator not starting

- Open Android Studio → **Virtual Device Manager** → make sure at least one AVD exists
- If the emulator is slow, enable hardware acceleration (HAXM on Intel, Hypervisor on AMD)
- Try: `npx expo start --android` instead of pressing `a` in the terminal

### SHA-1 fingerprint issues

- Make sure you're using the correct keystore (debug vs production)
- The debug keystore is auto-created the first time you build — if it doesn't exist, run any Android build first
- For EAS builds, use `eas credentials --platform android` to get the correct fingerprint

### "module not found" errors after install

```bash
# Clear all caches and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```
