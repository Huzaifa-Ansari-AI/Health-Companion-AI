-- AI Health Assistant Initial Schema
-- Production PostgreSQL Database Migration with Row Level Security (RLS)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Health Assessments Table
CREATE TABLE IF NOT EXISTS public.health_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  height_cm NUMERIC(5, 2) NOT NULL,
  weight_kg NUMERIC(5, 2) NOT NULL,
  bmi NUMERIC(4, 1) NOT NULL,
  bmi_category TEXT NOT NULL, -- 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity'
  symptoms TEXT[] DEFAULT '{}',
  lifestyle_data JSONB DEFAULT '{}'::jsonb, -- e.g. { sleep_hours: 7, activity_level: 'moderate', water_liters: 2 }
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  ai_summary TEXT NOT NULL,
  recommendations TEXT[] DEFAULT '{}',
  disclaimer TEXT NOT NULL DEFAULT 'This is not a medical diagnosis.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. RLS Policies: Health Assessments
CREATE POLICY "Users can view their own health assessments"
  ON public.health_assessments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health assessments"
  ON public.health_assessments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health assessments"
  ON public.health_assessments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Trigger: Automatically create profile on new user signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON public.health_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.health_assessments(created_at DESC);
