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

---

## 3. Row Level Security (RLS)

Row Level Security is enabled on all tables. Under no circumstances should RLS be disabled in production.

- **`profiles`:**
  - `SELECT`: `auth.uid() = id` (User can read only their own profile)
  - `UPDATE`: `auth.uid() = id` (User can update only their own profile)
  - `INSERT`: `auth.uid() = id`
- **`health_assessments`:**
  - `SELECT`: `auth.uid() = user_id` (User can read only their own assessments)
  - `INSERT`: `auth.uid() = user_id` (User can insert only records mapped to their own UID)
- **`report_shares`:**
  - `SELECT`: `auth.uid() = user_id` (User can read only their own share records)
  - `INSERT`: `auth.uid() = user_id` (User can create shares only for their own assessments)
  - `UPDATE`: `auth.uid() = user_id` (User can revoke only their own share links)
  - `DELETE`: `auth.uid() = user_id` (User can delete their own share records)
  - **CRITICAL:** **NO public policies exist on `report_shares`**. Public access is mediated strictly through the server-side `get-shared-report` Edge Function with SHA-256 token verification and IP rate limiting.

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
     - **Site URL:** `http://localhost:8080` (or your production domain on deployment)
     - **Redirect URLs:** `http://localhost:8080/**` (add `https://your-domain.com/**` for production)
   - **Production Launch Reminder:**
     - Before public launch, always ensure **Confirm email** is set to **ON**.
     - Note that Supabase's built-in default email service has a strict rate limit (~3 emails/hour on free tier). For production (Milestone 5), configure a custom SMTP provider (e.g. Resend, SendGrid, or AWS SES) in **Project Settings > Authentication > SMTP Settings**.

6. **Restart Vite Dev Server:**
   Restart `npm run dev` so Vite loads the new `.env` variables into memory.

