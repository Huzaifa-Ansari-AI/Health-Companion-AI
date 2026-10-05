-- ==============================================================================
-- Migration: 20261004140000_m3_tracking_schema.sql
-- Description: Milestone 3 - Daily Check-ins, Body Measurements, User Achievements
-- ==============================================================================

-- 1. Extend PROFILES Table with timezone preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
END $$;

-- 2. DAILY CHECKINS TABLE
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

-- Index for date-range queries
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date 
  ON public.daily_checkins(user_id, checkin_date DESC);

-- 3. BODY MEASUREMENTS TABLE
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

-- Index for time-series measurement queries
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_time 
  ON public.body_measurements(user_id, measured_at DESC);

-- 4. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_achievements_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user 
  ON public.user_achievements(user_id, unlocked_at DESC);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR daily_checkins (Owner only)
DROP POLICY IF EXISTS "Users can read own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can read own daily checkins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can insert own daily checkins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can update own daily checkins"
  ON public.daily_checkins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily checkins" ON public.daily_checkins;
CREATE POLICY "Users can delete own daily checkins"
  ON public.daily_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS POLICIES FOR body_measurements (Owner only)
DROP POLICY IF EXISTS "Users can read own body measurements" ON public.body_measurements;
CREATE POLICY "Users can read own body measurements"
  ON public.body_measurements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own body measurements" ON public.body_measurements;
CREATE POLICY "Users can insert own body measurements"
  ON public.body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own body measurements" ON public.body_measurements;
CREATE POLICY "Users can update own body measurements"
  ON public.body_measurements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own body measurements" ON public.body_measurements;
CREATE POLICY "Users can delete own body measurements"
  ON public.body_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- 8. RLS POLICIES FOR user_achievements (Owner only)
DROP POLICY IF EXISTS "Users can read own achievements" ON public.user_achievements;
CREATE POLICY "Users can read own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 9. BACKFILL: Populate initial body_measurements from existing health_assessments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_assessments') THEN
    INSERT INTO public.body_measurements (user_id, measured_at, weight_kg, height_cm, bmi, source, created_at)
    SELECT 
      user_id, 
      created_at AS measured_at, 
      weight_kg, 
      height_cm, 
      bmi, 
      'assessment' AS source, 
      created_at
    FROM public.health_assessments
    WHERE weight_kg IS NOT NULL AND weight_kg >= 20.0 AND weight_kg <= 350.0
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
