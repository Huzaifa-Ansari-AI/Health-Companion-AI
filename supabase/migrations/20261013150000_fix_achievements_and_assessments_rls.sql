-- ==============================================================================
-- Migration: 20261013150000_fix_achievements_and_assessments_rls.sql
-- Description: Add missing UPDATE and DELETE RLS policies for user_achievements
--              and missing UPDATE policy for health_assessments (for report edits)
-- ==============================================================================

-- 1. Ensure RLS is enabled
ALTER TABLE IF EXISTS public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.health_assessments ENABLE ROW LEVEL SECURITY;

-- 2. USER ACHIEVEMENTS POLICIES: Add owner-only UPDATE and DELETE
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
CREATE POLICY "Users can update own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own achievements" ON public.user_achievements;
CREATE POLICY "Users can delete own achievements"
  ON public.user_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- 3. HEALTH ASSESSMENTS POLICIES: Add owner-only UPDATE (required for report customizations)
DROP POLICY IF EXISTS "Users can update their own health assessments" ON public.health_assessments;
CREATE POLICY "Users can update their own health assessments"
  ON public.health_assessments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
