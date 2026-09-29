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
  - `DELETE`: `auth.uid() = user_id` (User can delete their own assessment history)

---

## 4. Supabase Edge Functions (AI Processing)

- **Function Directory:** [`supabase/functions/analyze-health/`](file:///d:/01_Career/01_Agentic%20AI/innerglow-insights/supabase/functions/analyze-health/)
- **Security:** Requires bearer token validation. The secret AI Provider key (`AI_API_KEY`) is stored strictly in Supabase Edge Secrets (`supabase secrets set AI_API_KEY=...`) and is never delivered to the client.
- **Safety Policy:**
  - Categorical risk outputs only (`Low` | `Medium` | `High`).
  - No medication prescriptions or direct clinical diagnosis.
  - Enforces mandatory medical disclaimer: *"This is not a medical diagnosis."*

---

## 5. Required Environment Variables

For the frontend application:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-anon-key
```
