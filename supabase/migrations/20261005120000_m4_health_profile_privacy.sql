-- ==============================================================================
-- Migration: 20261005120000_m4_health_profile_privacy.sql
-- Description: Milestone 4 - Health Profiles, Personalization & Privacy Consents
-- ==============================================================================

-- 1. HEALTH PROFILES TABLE (1-to-1 extension of profiles)
CREATE TABLE IF NOT EXISTS public.health_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  age INTEGER CHECK (age IS NULL OR (age >= 18 AND age <= 120)),
  gender TEXT CHECK (gender IS NULL OR length(gender) <= 50),
  time_zone TEXT DEFAULT 'UTC' CHECK (time_zone IS NULL OR length(time_zone) <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PROFILE ALLERGIES TABLE
CREATE TABLE IF NOT EXISTS public.profile_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  reaction TEXT CHECK (reaction IS NULL OR length(reaction) <= 200),
  severity TEXT CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profile_allergies_user 
  ON public.profile_allergies(user_id, created_at DESC);

-- 3. PROFILE CONDITIONS TABLE (Chronic or Managed Conditions)
CREATE TABLE IF NOT EXISTS public.profile_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'managed', 'past')),
  since_year INTEGER CHECK (since_year IS NULL OR (since_year >= 1900 AND since_year <= 2100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profile_conditions_user 
  ON public.profile_conditions(user_id, created_at DESC);

-- 4. PROFILE FAMILY HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.profile_family_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL CHECK (length(trim(condition_name)) > 0 AND length(condition_name) <= 100),
  relation TEXT NOT NULL CHECK (length(trim(relation)) > 0 AND length(relation) <= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profile_family_history_user 
  ON public.profile_family_history(user_id, created_at DESC);

-- 5. PROFILE MEDICATIONS TABLE (Context Only - Non-Prescriptive)
CREATE TABLE IF NOT EXISTS public.profile_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  dose_text TEXT CHECK (dose_text IS NULL OR length(dose_text) <= 80),
  frequency_text TEXT CHECK (frequency_text IS NULL OR length(frequency_text) <= 80),
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profile_medications_user 
  ON public.profile_medications(user_id, created_at DESC);

-- 6. PRIVACY CONSENTS TABLE (Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS public.privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('ai_chat_processing', 'ai_profile_context', 'ai_report_generation', 'share_links', 'analytics')),
  granted BOOLEAN NOT NULL DEFAULT false,
  policy_version TEXT NOT NULL DEFAULT '1.0' CHECK (length(policy_version) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_privacy_consents_user_type_created 
  ON public.privacy_consents(user_id, consent_type, created_at DESC);

-- 7. DATA EXPORT REQUESTS TABLE (Audit & Rate Limiting)
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('json', 'pdf')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_created 
  ON public.data_export_requests(user_id, created_at DESC);

-- 8. ACCOUNT DELETION REQUESTS TABLE (Audit & Rate Limiting)
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_created 
  ON public.account_deletion_requests(user_id, created_at DESC);

-- 9. ENABLE ROW LEVEL SECURITY ON ALL NEW TABLES
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_family_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES FOR health_profiles (Owner Only)
DROP POLICY IF EXISTS "Users can read own health profile" ON public.health_profiles;
CREATE POLICY "Users can read own health profile"
  ON public.health_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own health profile" ON public.health_profiles;
CREATE POLICY "Users can insert own health profile"
  ON public.health_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own health profile" ON public.health_profiles;
CREATE POLICY "Users can update own health profile"
  ON public.health_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own health profile" ON public.health_profiles;
CREATE POLICY "Users can delete own health profile"
  ON public.health_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- 11. RLS POLICIES FOR profile_allergies (Owner Only)
DROP POLICY IF EXISTS "Users can read own allergies" ON public.profile_allergies;
CREATE POLICY "Users can read own allergies"
  ON public.profile_allergies FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own allergies" ON public.profile_allergies;
CREATE POLICY "Users can insert own allergies"
  ON public.profile_allergies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own allergies" ON public.profile_allergies;
CREATE POLICY "Users can update own allergies"
  ON public.profile_allergies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own allergies" ON public.profile_allergies;
CREATE POLICY "Users can delete own allergies"
  ON public.profile_allergies FOR DELETE
  USING (auth.uid() = user_id);

-- 12. RLS POLICIES FOR profile_conditions (Owner Only)
DROP POLICY IF EXISTS "Users can read own conditions" ON public.profile_conditions;
CREATE POLICY "Users can read own conditions"
  ON public.profile_conditions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conditions" ON public.profile_conditions;
CREATE POLICY "Users can insert own conditions"
  ON public.profile_conditions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conditions" ON public.profile_conditions;
CREATE POLICY "Users can update own conditions"
  ON public.profile_conditions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conditions" ON public.profile_conditions;
CREATE POLICY "Users can delete own conditions"
  ON public.profile_conditions FOR DELETE
  USING (auth.uid() = user_id);

-- 13. RLS POLICIES FOR profile_family_history (Owner Only)
DROP POLICY IF EXISTS "Users can read own family history" ON public.profile_family_history;
CREATE POLICY "Users can read own family history"
  ON public.profile_family_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own family history" ON public.profile_family_history;
CREATE POLICY "Users can insert own family history"
  ON public.profile_family_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own family history" ON public.profile_family_history;
CREATE POLICY "Users can update own family history"
  ON public.profile_family_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own family history" ON public.profile_family_history;
CREATE POLICY "Users can delete own family history"
  ON public.profile_family_history FOR DELETE
  USING (auth.uid() = user_id);

-- 14. RLS POLICIES FOR profile_medications (Owner Only)
DROP POLICY IF EXISTS "Users can read own medications" ON public.profile_medications;
CREATE POLICY "Users can read own medications"
  ON public.profile_medications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own medications" ON public.profile_medications;
CREATE POLICY "Users can insert own medications"
  ON public.profile_medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own medications" ON public.profile_medications;
CREATE POLICY "Users can update own medications"
  ON public.profile_medications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own medications" ON public.profile_medications;
CREATE POLICY "Users can delete own medications"
  ON public.profile_medications FOR DELETE
  USING (auth.uid() = user_id);

-- 15. RLS POLICIES FOR privacy_consents (Append-Only: Owner SELECT & INSERT only)
DROP POLICY IF EXISTS "Users can read own privacy consents" ON public.privacy_consents;
CREATE POLICY "Users can read own privacy consents"
  ON public.privacy_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own privacy consents" ON public.privacy_consents;
CREATE POLICY "Users can insert own privacy consents"
  ON public.privacy_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 16. RLS POLICIES FOR data_export_requests (Owner SELECT & INSERT)
DROP POLICY IF EXISTS "Users can read own data export requests" ON public.data_export_requests;
CREATE POLICY "Users can read own data export requests"
  ON public.data_export_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own data export requests" ON public.data_export_requests;
CREATE POLICY "Users can insert own data export requests"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 17. RLS POLICIES FOR account_deletion_requests (Owner SELECT & INSERT)
DROP POLICY IF EXISTS "Users can read own account deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can read own account deletion requests"
  ON public.account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can insert own account deletion requests"
  ON public.account_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
