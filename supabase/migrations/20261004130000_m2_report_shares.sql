-- Milestone 2: Secure Shareable Report Links Schema
-- Migration: 20261004130000_m2_report_shares.sql
-- Implements immutable snapshot-based expiring share links with SHA-256 token hashing and owner-only RLS.

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

-- Performance and lookup indexing
CREATE INDEX IF NOT EXISTS idx_report_shares_user_id ON public.report_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_token_hash ON public.report_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_report_shares_assessment_id ON public.report_shares(assessment_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires_at ON public.report_shares(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Owner-only RLS Policies (NO PUBLIC POLICIES: Public access strictly mediated via Edge Function with token verification)
CREATE POLICY "Users can view their own report shares"
  ON public.report_shares
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own report shares"
  ON public.report_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own report shares"
  ON public.report_shares
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report shares"
  ON public.report_shares
  FOR DELETE
  USING (auth.uid() = user_id);

-- Documentation comments
COMMENT ON TABLE public.report_shares IS 'Stores expiring, snapshot-based secure sharing links for health reports.';
COMMENT ON COLUMN public.report_shares.token_hash IS 'SHA-256 cryptographic hash of the 32-byte secret sharing token.';
COMMENT ON COLUMN public.report_shares.snapshot IS 'Immutable JSONB snapshot of the report at the time of link creation.';
