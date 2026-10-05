-- Milestone 1: AI Chat Sessions, Messages & Health Assessment Schema Expansion
-- Migration: 20260929120000_chat_schema.sql
-- Production PostgreSQL Database Migration with Row Level Security (RLS)

-- 1. Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Health Consultation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: chat_sessions (Owner-Only Access)
CREATE POLICY "Users can view their own chat sessions"
  ON public.chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON public.chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON public.chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies: chat_messages (Owner-Only Access)
CREATE POLICY "Users can view their own chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages"
  ON public.chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON public.chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Expand health_assessments table to support chat-derived assessments
-- Make physical vitals nullable for chat-based entries
ALTER TABLE public.health_assessments ALTER COLUMN height_cm DROP NOT NULL;
ALTER TABLE public.health_assessments ALTER COLUMN weight_kg DROP NOT NULL;
ALTER TABLE public.health_assessments ALTER COLUMN bmi DROP NOT NULL;
ALTER TABLE public.health_assessments ALTER COLUMN bmi_category DROP NOT NULL;

-- Add source discriminator, foreign key to session, and structured chat summary data
ALTER TABLE public.health_assessments 
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'assessment' CHECK (source IN ('assessment', 'chat')),
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chat_summary_data JSONB DEFAULT '{}'::jsonb;

-- Index for session references
CREATE INDEX IF NOT EXISTS idx_assessments_session_id ON public.health_assessments(session_id);
