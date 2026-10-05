# Supabase Architecture & Backend Specification

## Overview

The **AI Health Assistant** backend is powered by **Supabase**, providing authentication, a PostgreSQL database, strict Row Level Security (RLS) policies, and serverless Edge Functions for secure AI processing.

```
React (Vite Frontend)
        │
        ├── Direct Supabase Client (Anon Key)
        │   ├── Authentication (Session Management)
        │   └── PostgreSQL Queries (Protected by RLS)
        │
        └── Serverless Edge Function (JWT Auth)
            └── Secure AI Evaluation (Categorical Risk Assessment)
```

---

## 1. Authentication

- **Mechanism:** Supabase GoTrue Auth (Email & Password).
- **Session Persistence:** Auto-refreshing JWT stored securely in browser storage (`persistSession: true`).
- **Isolation:** Isolated Demo mode provides local session simulation for testing without touching production user stores.

---

## 2. PostgreSQL Schema & Tables

Migration file: [`supabase/migrations/20260929_init_schema.sql`](file:///d:/01_Career/01_Agentic%20AI/innerglow-insights/supabase/migrations/20260929_init_schema.sql)

### `public.profiles`
Stores user profile information, automatically created when a user signs up.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, References `auth.users(id)` ON DELETE CASCADE | Matches user's auth UID |
| `email` | TEXT | NOT NULL | User contact email |
| `full_name` | TEXT | NULL | User display name |
| `age` | INTEGER | NULL | Optional age |
| `gender` | TEXT | NULL | Optional gender |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Last update timestamp |

### `public.health_assessments`
Stores immutable records of biometric assessments, symptoms, risk calculations, and AI observations.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique record ID |
| `user_id` | UUID | NOT NULL, References `public.profiles(id)` ON DELETE CASCADE | Owner UID |
| `height_cm` | NUMERIC(5,2) | NOT NULL | Height in centimeters |
| `weight_kg` | NUMERIC(5,2) | NOT NULL | Weight in kilograms |
| `bmi` | NUMERIC(4,1) | NOT NULL | Computed Body Mass Index |
| `bmi_category`| TEXT | NOT NULL | Underweight / Normal / Overweight / Obesity |
| `symptoms` | TEXT[] | DEFAULT `'{}'` | Array of reported symptoms |
| `lifestyle_data`| JSONB | DEFAULT `'{}'` | Sleep, hydration, activity level metrics |
| `risk_level` | TEXT | CHECK (`risk_level IN ('Low', 'Medium', 'High')`) | Categorical wellness risk rating |
| `ai_summary` | TEXT | NOT NULL | Concise AI wellness observation |
| `recommendations`| TEXT[]| DEFAULT `'{}'` | Array of actionable lifestyle habits |
| `disclaimer` | TEXT | NOT NULL | Medical disclaimer notice |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Timestamp of assessment |

### `public.report_shares` (Milestone 2)
Stores time-limited, read-only immutable report snapshots accessible via cryptographically hashed tokens.
Migration file: [`supabase/migrations/20261004130000_m2_report_shares.sql`](file:///d:/01_Career/01_Agentic%20AI/Health%20Companion%20AI/supabase/migrations/20261004130000_m2_report_shares.sql)

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique share record ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `assessment_id` | UUID | NOT NULL, References `health_assessments(id)` ON DELETE CASCADE | Target assessment ID |
| `token_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 hash of the 32-byte secret access token |
| `snapshot` | JSONB | NOT NULL | Immutable sanitized `ReportData` snapshot at share time |
| `expires_at` | TIMESTAMPTZ | NOT NULL, CHECK (`expires_at > created_at`) | Share link expiration timestamp (max 7 days) |
| `revoked_at` | TIMESTAMPTZ | NULL | Revocation timestamp if explicitly revoked |
| `view_count` | INTEGER | NOT NULL DEFAULT 0 CHECK (`view_count >= 0`) | Number of times the report has been viewed |
| `last_viewed_at` | TIMESTAMPTZ | NULL | Timestamp of most recent view |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Creation timestamp |

### `public.daily_checkins` (Milestone 3)
Stores 30-second daily habit logs, vitals, mood, energy, and private reflections.
Migration file: [`supabase/migrations/20261004140000_m3_tracking_schema.sql`](file:///d:/01_Career/01_Agentic%20AI/Health%20Companion%20AI/supabase/migrations/20261004140000_m3_tracking_schema.sql)

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique log ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `checkin_date` | DATE | NOT NULL | Calendar date of check-in (UNIQUE per user) |
| `mood` | SMALLINT | CHECK (`mood BETWEEN 1 AND 5`) | 1 (Very Low) to 5 (Great) |
| `sleep_hours` | NUMERIC(3,1) | CHECK (`sleep_hours BETWEEN 0 AND 24`) | Rest duration |
| `water_intake_ml` | INTEGER | CHECK (`water_intake_ml BETWEEN 0 AND 10000`) | Daily hydration in ml |
| `daily_energy` | SMALLINT | CHECK (`daily_energy BETWEEN 1 AND 5`) | Energy score |
| `activity_level` | TEXT | CHECK (`activity_level IN ('Sedentary', 'Light', 'Moderate', 'Very Active')`) | Activity tier |
| `activity_minutes` | INTEGER | CHECK (`activity_minutes BETWEEN 0 AND 1440`) | Active workout minutes |
| `reported_fatigue` | SMALLINT | CHECK (`reported_fatigue BETWEEN 1 AND 5`) | Self-reported fatigue score |
| `notes` | TEXT | NULL (Limit 500 chars) | Private reflection notes (crisis-filtered) |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Last update timestamp |

### `public.body_measurements` (Milestone 3)
Stores longitudinal biometric logs (weight, height, BMI) over time.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique entry ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `measured_date` | DATE | NOT NULL | Date of measurement |
| `height_cm` | NUMERIC(5,2) | CHECK (`height_cm > 0`) | Height |
| `weight_kg` | NUMERIC(5,2) | CHECK (`weight_kg > 0`) | Weight |
| `bmi` | NUMERIC(4,1) | NOT NULL | Calculated Body Mass Index |
| `bmi_category` | TEXT | NOT NULL | Underweight / Normal / Overweight / Obesity |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Creation timestamp |

### `public.user_achievements` (Milestone 3)
Tracks unlocked wellness milestones and streak badges.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Record ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `badge_id` | TEXT | NOT NULL (UNIQUE with `user_id`) | E.g. `first_checkin`, `streak_3`, `streak_7` |
| `unlocked_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Unlock timestamp |

### `public.health_profiles` (Milestone 4)
Stores core extended profile demographics, age, gender, and timezone.
Migration file: [`supabase/migrations/20261005120000_m4_health_profile_privacy.sql`](file:///d:/01_Career/01_Agentic%20AI/Health%20Companion%20AI/supabase/migrations/20261005120000_m4_health_profile_privacy.sql)

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `user_id` | UUID | Primary Key, References `profiles(id)` ON DELETE CASCADE | Matches auth UID |
| `date_of_birth` | DATE | NULL | Optional exact date of birth |
| `age` | INTEGER | CHECK (`age BETWEEN 18 AND 120`) | Self-reported adult age |
| `gender` | TEXT | Limit 50 chars | Optional gender identity |
| `time_zone` | TEXT | Limit 50 chars | User's preferred timezone |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Last update timestamp |

### `public.profile_allergies` (Milestone 4)
Known allergies with categorical severity ratings.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique allergy ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `name` | TEXT | NOT NULL, Limit 100 chars | Name of allergen |
| `reaction` | TEXT | NULL, Limit 200 chars | Description of reaction |
| `severity` | TEXT | CHECK (`severity IN ('mild', 'moderate', 'severe')`) | Severity tier |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Record timestamp |

### `public.profile_conditions` (Milestone 4)
Health conditions with active/managed/past status tags.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique condition ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `name` | TEXT | NOT NULL, Limit 100 chars | Name of condition |
| `status` | TEXT | CHECK (`status IN ('active', 'managed', 'past')`) | Condition lifecycle status |
| `since_year` | INTEGER | CHECK (`since_year >= 1900`) | Year diagnosed/noticed |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Record timestamp |

### `public.profile_family_history` (Milestone 4)
Family health background records.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique record ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `condition_name`| TEXT | NOT NULL, Limit 100 chars | Name of hereditary condition |
| `relation` | TEXT | NOT NULL, Limit 60 chars | E.g. Mother, Father, Grandparent |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Record timestamp |

### `public.profile_medications` (Milestone 4)
Reported current medications (Background context only — non-prescriptive).

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique medication ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `name` | TEXT | NOT NULL, Limit 100 chars | Name of medication |
| `dose_text` | TEXT | NULL, Limit 80 chars | Dosage note (context only) |
| `frequency_text`| TEXT | NULL, Limit 80 chars | Frequency note (context only) |
| `is_current` | BOOLEAN | DEFAULT `true` | Active vs past medication |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Record timestamp |

### `public.privacy_consents` (Milestone 4)
Append-only audit trail of granular user permission grants and revocations.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, DEFAULT `gen_random_uuid()` | Unique consent event ID |
| `user_id` | UUID | NOT NULL, References `profiles(id)` ON DELETE CASCADE | Owner UID |
| `consent_type` | TEXT | CHECK (`consent_type IN ('ai_chat_processing', 'ai_profile_context', 'ai_report_generation', 'share_links', 'analytics')`) | Granular feature permission |
| `granted` | BOOLEAN | NOT NULL | Permission state (`true` = granted, `false` = revoked) |
| `policy_version`| TEXT | NOT NULL DEFAULT `'1.0'` | Privacy policy version active at time of event |
| `created_at` | TIMESTAMPTZ | DEFAULT `timezone('utc', now())` | Immutable event timestamp |

### `public.data_export_requests` & `public.account_deletion_requests` (Milestone 4)
Audit logs for data portability requests and account deletion compliance.

---

## 3. Row Level Security (RLS)

Row Level Security is enabled on all tables. Under no circumstances should RLS be disabled in production.

- **`profiles`:**
  - `SELECT`: `auth.uid() = id` (User can read only their own profile)
  - `UPDATE`: `auth.uid() = id` (User can update only their own profile)
  - `INSERT`: `auth.uid() = id`
  - `DELETE`: `auth.uid() = id` (User can delete their own profile)
- **`health_assessments`:**
  - `SELECT`: `auth.uid() = user_id` (User can read only their own assessments)
  - `INSERT`: `auth.uid() = user_id` (User can insert only records mapped to their own UID)
  - `DELETE`: `auth.uid() = user_id`
- **`report_shares`:**
  - `SELECT`: `auth.uid() = user_id` (User can read only their own share records)
  - `INSERT`: `auth.uid() = user_id` (User can create shares only for their own assessments)
  - `UPDATE`: `auth.uid() = user_id` (User can revoke only their own share links)
  - `DELETE`: `auth.uid() = user_id` (User can delete their own share records)
  - **CRITICAL:** **NO public policies exist on `report_shares`**. Public access is mediated strictly through the server-side `get-shared-report` Edge Function with SHA-256 token verification and IP rate limiting.
- **`daily_checkins` & `body_measurements` & `user_achievements`:**
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE`: `auth.uid() = user_id` (Owner only)
- **`health_profiles`, `profile_allergies`, `profile_conditions`, `profile_family_history`, `profile_medications`:**
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE`: `auth.uid() = user_id` (Owner only)
- **`privacy_consents` (Append-Only):**
  - `SELECT`: `auth.uid() = user_id` (Owner only)
  - `INSERT`: `auth.uid() = user_id` (Owner only)
  - **NO UPDATE OR DELETE POLICIES:** Log is strictly immutable and append-only.
- **`data_export_requests` & `account_deletion_requests`:**
  - `SELECT`, `INSERT`: `auth.uid() = user_id` (Owner only)
- **`body_measurements`:**
  - `SELECT`: `auth.uid() = user_id` (Owner only)
  - `INSERT`: `auth.uid() = user_id` (Owner only)
  - `UPDATE`: `auth.uid() = user_id` (Owner only)
  - `DELETE`: `auth.uid() = user_id` (Owner only)
- **`user_achievements`:**
  - `SELECT`: `auth.uid() = user_id` (Owner only)
  - `INSERT`: `auth.uid() = user_id` (Owner only)
  - `UPDATE`: `auth.uid() = user_id` (Owner only)

---

## 4. Supabase Edge Functions

| Function Name | Auth Requirement | Purpose & Security Controls |
|---|---|---|
| `analyze-health` | JWT (Authenticated) | Risk assessment and habit generation. |
| `chat-consult` | JWT (Authenticated) | Symptom discovery chatbot with emergency detector and prompt injection sanitization. |
| `create-share-link` | JWT (Authenticated) | Creates expiring share link, generates 32-byte token, computes SHA-256 hash, stores immutable snapshot. |
| `get-shared-report` | Public (No JWT) | Validates public token hash, checks expiration and revocation, increments view count, returns snapshot with uniform error masking. Rate limited per IP (30 req/min). |
| `revoke-share-link` | JWT (Authenticated) | Sets `revoked_at` timestamp on active share links owned by caller. |
| `generate-doctor-questions` | JWT (Authenticated) | Synthesizes 4-6 non-diagnostic physician discussion questions with strict guardrails. |

- **Security & Secret Management:** AI provider keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) and `SUPABASE_SERVICE_ROLE_KEY` reside exclusively in Supabase Edge Secrets (`supabase secrets set ...`). They are never exposed to the client or version control.
- **Safety Policy:**
  - Categorical risk outputs only (`Low` | `Medium` | `High`).
  - No medication prescriptions, dosages, or direct clinical diagnoses.
  - Enforces mandatory medical disclaimer: *"This is not a medical diagnosis."*

---

## 5. Required Environment Variables

For the frontend application (`.env` in project root):
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
*(Note: `VITE_SUPABASE_PUBLISHABLE_KEY` is also supported as a direct alias).*

---

## 6. Step-by-Step Supabase Project Setup

1. **Create or Open Supabase Project:**
   Navigate to the [Supabase Dashboard](https://supabase.com/dashboard) and create or select your project.

2. **Retrieve API Credentials:**
   - In your project, go to **Project Settings > API**.
   - Copy the **Project URL** (e.g. `https://xyzproject.supabase.co`).
   - Copy the **`anon` `public`** API key.

3. **Configure Local Environment:**
   - Create a `.env` file in the project root:
     ```bash
     VITE_SUPABASE_URL=https://xyzproject.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - Verify that `.env` is listed in `.gitignore` (never commit real keys).

4. **Execute Database Migration:**
   - Open the **SQL Editor** in the Supabase Dashboard.
   - Copy and paste the contents of [`supabase/migrations/20260929_init_schema.sql`](file:///d:/01_Career/01_Agentic%20AI/innerglow-insights/supabase/migrations/20260929_init_schema.sql).
   - Click **Run** to provision `profiles`, `health_assessments`, RLS policies, and the `on_auth_user_created` trigger.

5. **Configure Authentication Settings:**
   - Go to **Authentication > Providers > Email**:
     - **For quick local development (no email delay):** You can toggle **Confirm email** **OFF**. Users will be logged in immediately on signup.
     - **For real email verification testing:** Leave **Confirm email** **ON**. When signing up, users will see the "Check your email" screen with a 60-second resend cooldown timer.
     - *(Manual confirmation shortcut):* In the Supabase Dashboard under **Authentication > Users**, you can click the three dots (`...`) next to any unconfirmed user and select **Confirm User** to manually activate them.
   - Go to **Authentication > URL Configuration**:
     - **Site URL:** `http://localhost:5174` (or your production domain on deployment)
     - **Redirect URLs:** `http://localhost:5174/**` (add `https://your-domain.com/**` for production)
   - **Production Launch Reminder:**
     - Before public launch, always ensure **Confirm email** is set to **ON**.
     - Note that Supabase's built-in default email service has a strict rate limit (~3 emails/hour on free tier). For production (Milestone 5), configure a custom SMTP provider (e.g. Resend, SendGrid, or AWS SES) in **Project Settings > Authentication > SMTP Settings**.

6. **Restart Vite Dev Server:**
   Restart `npm run dev` so Vite loads the new `.env` variables into memory.

