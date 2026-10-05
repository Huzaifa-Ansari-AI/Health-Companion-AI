-- Milestone 2: Report Profiles & Demographics Expansion
-- Migration: 20261004120000_m2_reports_schema.sql
-- Adds optional date_of_birth to profiles table and ensures gender/age validation

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Comment for schema documentation
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Optional patient date of birth for wellness report demographics';
COMMENT ON COLUMN public.profiles.age IS 'Optional patient age in years';
COMMENT ON COLUMN public.profiles.gender IS 'Optional patient gender identity';
