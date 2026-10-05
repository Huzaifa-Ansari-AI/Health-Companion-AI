-- ==============================================================================
-- HEALTH COMPANION AI — COMPLETE CONSOLIDATED SUPABASE DATABASE SETUP
-- Run this entire script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backfill any existing users from auth.users into public.profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id, 
  COALESCE(email, ''), 
  COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Trigger: Automatically insert/update profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create CHAT SESSIONS Table (Milestone 1)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Health Consultation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create CHAT MESSAGES Table (Milestone 1)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create HEALTH ASSESSMENTS Table (Milestones 0, 1 & 2)
CREATE TABLE IF NOT EXISTS public.health_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  height_cm NUMERIC(5, 2),
  weight_kg NUMERIC(5, 2),
  bmi NUMERIC(4, 1),
  bmi_category TEXT,
  symptoms TEXT[] DEFAULT '{}',
  lifestyle_data JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  ai_summary TEXT NOT NULL,
  recommendations TEXT[] DEFAULT '{}',
  disclaimer TEXT NOT NULL DEFAULT 'This is not a medical diagnosis.',
  source TEXT NOT NULL DEFAULT 'assessment' CHECK (source IN ('assessment', 'chat')),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  chat_summary_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Create REPORT SHARES Table (Milestone 2)
CREATE TABLE IF NOT EXISTS public.report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.health_assessments(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- 7. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON public.health_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.health_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_session_id ON public.health_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_report_shares_user_id ON public.report_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_token_hash ON public.report_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_report_shares_assessment_id ON public.report_shares(assessment_id);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies: Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 10. RLS Policies: Health Assessments
DROP POLICY IF EXISTS "Users can view their own health assessments" ON public.health_assessments;
CREATE POLICY "Users can view their own health assessments" ON public.health_assessments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own health assessments" ON public.health_assessments;
CREATE POLICY "Users can insert their own health assessments" ON public.health_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own health assessments" ON public.health_assessments;
CREATE POLICY "Users can delete their own health assessments" ON public.health_assessments FOR DELETE USING (auth.uid() = user_id);

-- 11. RLS Policies: Chat Sessions
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert their own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- 12. RLS Policies: Chat Messages
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view their own chat messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can update their own chat messages" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete their own chat messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- 13. RLS Policies: Report Shares (Strictly owner-only, no public policies)
DROP POLICY IF EXISTS "Users can view their own report shares" ON public.report_shares;
CREATE POLICY "Users can view their own report shares" ON public.report_shares FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own report shares" ON public.report_shares;
CREATE POLICY "Users can insert their own report shares" ON public.report_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own report shares" ON public.report_shares;
CREATE POLICY "Users can update their own report shares" ON public.report_shares FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own report shares" ON public.report_shares;
CREATE POLICY "Users can delete their own report shares" ON public.report_shares FOR DELETE USING (auth.uid() = user_id);

-- 14. MILESTONE 3: Tracking, Measurements & Achievements Tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  mood SMALLINT NOT NULL CHECK (mood >= 1 AND mood <= 5),
  sleep_hours NUMERIC(3, 1) NOT NULL CHECK (sleep_hours >= 0.0 AND sleep_hours <= 24.0),
  water_ml INTEGER NOT NULL CHECK (water_ml >= 0 AND water_ml <= 10000),
  energy SMALLINT NOT NULL CHECK (energy >= 1 AND energy <= 10),
  fatigue SMALLINT NOT NULL CHECK (fatigue >= 1 AND fatigue <= 5),
  activity_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (activity_minutes >= 0 AND activity_minutes <= 1440),
  note TEXT CHECK (note IS NULL OR length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT daily_checkins_user_date_key UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON public.daily_checkins(user_id, checkin_date DESC);

CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg >= 20.0 AND weight_kg <= 350.0),
  height_cm NUMERIC(5, 2) CHECK (height_cm IS NULL OR (height_cm >= 50.0 AND height_cm <= 260.0)),
  bmi NUMERIC(4, 1) CHECK (bmi IS NULL OR (bmi >= 5.0 AND bmi <= 100.0)),
  source TEXT NOT NULL CHECK (source IN ('assessment', 'checkin', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_time ON public.body_measurements(user_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_achievements_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id, unlocked_at DESC);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Daily Checkins RLS
DROP POLICY IF EXISTS "Users can read own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can read own daily checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can insert own daily checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can update own daily checkins" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can delete own daily checkins" ON public.daily_checkins FOR DELETE USING (auth.uid() = user_id);

-- Body Measurements RLS
DROP POLICY IF EXISTS "Users can read own body measurements" ON public.body_measurements;
CREATE POLICY "Users can read own body measurements" ON public.body_measurements FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own body measurements" ON public.body_measurements;
CREATE POLICY "Users can insert own body measurements" ON public.body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own body measurements" ON public.body_measurements;
CREATE POLICY "Users can update own body measurements" ON public.body_measurements FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own body measurements" ON public.body_measurements;
CREATE POLICY "Users can delete own body measurements" ON public.body_measurements FOR DELETE USING (auth.uid() = user_id);

-- User Achievements RLS
DROP POLICY IF EXISTS "Users can read own achievements" ON public.user_achievements;
CREATE POLICY "Users can read own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Backfill initial measurements from assessments
INSERT INTO public.body_measurements (user_id, measured_at, weight_kg, height_cm, bmi, source, created_at)
SELECT user_id, created_at AS measured_at, weight_kg, height_cm, bmi, 'assessment' AS source, created_at
FROM public.health_assessments
WHERE weight_kg IS NOT NULL AND weight_kg >= 20.0 AND weight_kg <= 350.0
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 7. MILESTONE 4: HEALTH PROFILES, PERSONALIZATION & PRIVACY CONSENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.health_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  age INTEGER CHECK (age IS NULL OR (age >= 18 AND age <= 120)),
  gender TEXT CHECK (gender IS NULL OR length(gender) <= 50),
  time_zone TEXT DEFAULT 'UTC' CHECK (time_zone IS NULL OR length(time_zone) <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.profile_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  reaction TEXT CHECK (reaction IS NULL OR length(reaction) <= 200),
  severity TEXT CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_profile_allergies_user ON public.profile_allergies(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'managed', 'past')),
  since_year INTEGER CHECK (since_year IS NULL OR (since_year >= 1900 AND since_year <= 2100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_profile_conditions_user ON public.profile_conditions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_family_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL CHECK (length(trim(condition_name)) > 0 AND length(condition_name) <= 100),
  relation TEXT NOT NULL CHECK (length(trim(relation)) > 0 AND length(relation) <= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_profile_family_history_user ON public.profile_family_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  dose_text TEXT CHECK (dose_text IS NULL OR length(dose_text) <= 80),
  frequency_text TEXT CHECK (frequency_text IS NULL OR length(frequency_text) <= 80),
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_profile_medications_user ON public.profile_medications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('ai_chat_processing', 'ai_profile_context', 'ai_report_generation', 'share_links', 'analytics')),
  granted BOOLEAN NOT NULL DEFAULT false,
  policy_version TEXT NOT NULL DEFAULT '1.0' CHECK (length(policy_version) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user_type_created ON public.privacy_consents(user_id, consent_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('json', 'pdf')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_created ON public.data_export_requests(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_created ON public.account_deletion_requests(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_family_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Health Profiles RLS
DROP POLICY IF EXISTS "Users can read own health profile" ON public.health_profiles;
CREATE POLICY "Users can read own health profile" ON public.health_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own health profile" ON public.health_profiles;
CREATE POLICY "Users can insert own health profile" ON public.health_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own health profile" ON public.health_profiles;
CREATE POLICY "Users can update own health profile" ON public.health_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own health profile" ON public.health_profiles;
CREATE POLICY "Users can delete own health profile" ON public.health_profiles FOR DELETE USING (auth.uid() = user_id);

-- Profile Allergies RLS
DROP POLICY IF EXISTS "Users can read own allergies" ON public.profile_allergies;
CREATE POLICY "Users can read own allergies" ON public.profile_allergies FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own allergies" ON public.profile_allergies;
CREATE POLICY "Users can insert own allergies" ON public.profile_allergies FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own allergies" ON public.profile_allergies;
CREATE POLICY "Users can update own allergies" ON public.profile_allergies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own allergies" ON public.profile_allergies;
CREATE POLICY "Users can delete own allergies" ON public.profile_allergies FOR DELETE USING (auth.uid() = user_id);

-- Profile Conditions RLS
DROP POLICY IF EXISTS "Users can read own conditions" ON public.profile_conditions;
CREATE POLICY "Users can read own conditions" ON public.profile_conditions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own conditions" ON public.profile_conditions;
CREATE POLICY "Users can insert own conditions" ON public.profile_conditions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own conditions" ON public.profile_conditions;
CREATE POLICY "Users can update own conditions" ON public.profile_conditions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own conditions" ON public.profile_conditions;
CREATE POLICY "Users can delete own conditions" ON public.profile_conditions FOR DELETE USING (auth.uid() = user_id);

-- Profile Family History RLS
DROP POLICY IF EXISTS "Users can read own family history" ON public.profile_family_history;
CREATE POLICY "Users can read own family history" ON public.profile_family_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own family history" ON public.profile_family_history;
CREATE POLICY "Users can insert own family history" ON public.profile_family_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own family history" ON public.profile_family_history;
CREATE POLICY "Users can update own family history" ON public.profile_family_history FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own family history" ON public.profile_family_history;
CREATE POLICY "Users can delete own family history" ON public.profile_family_history FOR DELETE USING (auth.uid() = user_id);

-- Profile Medications RLS
DROP POLICY IF EXISTS "Users can read own medications" ON public.profile_medications;
CREATE POLICY "Users can read own medications" ON public.profile_medications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own medications" ON public.profile_medications;
CREATE POLICY "Users can insert own medications" ON public.profile_medications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own medications" ON public.profile_medications;
CREATE POLICY "Users can update own medications" ON public.profile_medications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own medications" ON public.profile_medications;
CREATE POLICY "Users can delete own medications" ON public.profile_medications FOR DELETE USING (auth.uid() = user_id);

-- Privacy Consents RLS (Append-Only)
DROP POLICY IF EXISTS "Users can read own privacy consents" ON public.privacy_consents;
CREATE POLICY "Users can read own privacy consents" ON public.privacy_consents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own privacy consents" ON public.privacy_consents;
CREATE POLICY "Users can insert own privacy consents" ON public.privacy_consents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Data Export Requests RLS
DROP POLICY IF EXISTS "Users can read own data export requests" ON public.data_export_requests;
CREATE POLICY "Users can read own data export requests" ON public.data_export_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own data export requests" ON public.data_export_requests;
CREATE POLICY "Users can insert own data export requests" ON public.data_export_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Account Deletion Requests RLS
DROP POLICY IF EXISTS "Users can read own account deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can read own account deletion requests" ON public.account_deletion_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own account deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can insert own account deletion requests" ON public.account_deletion_requests FOR INSERT WITH CHECK (auth.uid() = user_id);


