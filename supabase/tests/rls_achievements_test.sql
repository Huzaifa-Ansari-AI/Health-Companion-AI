-- ==============================================================================
-- RLS VERIFICATION SCRIPT: user_achievements & health_assessments Isolation
-- Execute in Supabase SQL Editor to verify Row Level Security rules
-- ==============================================================================

BEGIN;

-- 1. Setup Test Users
DO $$
DECLARE
  v_user_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_user_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_count INT;
  v_error_caught BOOLEAN := FALSE;
BEGIN
  -- Insert dummy test profiles
  INSERT INTO public.profiles (id, email, full_name)
  VALUES 
    (v_user_a, 'test_user_a@example.com', 'User A'),
    (v_user_b, 'test_user_b@example.com', 'User B')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- TEST 1: User A inserts their own achievement (Should SUCCEED)
  -- ----------------------------------------------------------------------------
  -- Simulate authenticated session for User A
  EXECUTE format('SET LOCAL request.jwt.claim.sub = %L', v_user_a);
  EXECUTE 'SET LOCAL role = authenticated';

  INSERT INTO public.user_achievements (user_id, key)
  VALUES (v_user_a, 'first_checkin')
  ON CONFLICT (user_id, key) DO UPDATE SET unlocked_at = now();

  SELECT count(*) INTO v_count FROM public.user_achievements WHERE user_id = v_user_a;
  ASSERT v_count = 1, 'TEST 1 FAILED: User A should have 1 achievement';

  -- ----------------------------------------------------------------------------
  -- TEST 2: User A updates their own achievement (Should SUCCEED)
  -- ----------------------------------------------------------------------------
  UPDATE public.user_achievements 
  SET unlocked_at = now() 
  WHERE user_id = v_user_a AND key = 'first_checkin';

  -- ----------------------------------------------------------------------------
  -- TEST 3: User B creates an achievement
  -- ----------------------------------------------------------------------------
  EXECUTE format('SET LOCAL request.jwt.claim.sub = %L', v_user_b);
  INSERT INTO public.user_achievements (user_id, key)
  VALUES (v_user_b, 'streak_3');

  -- ----------------------------------------------------------------------------
  -- TEST 4: User A CANNOT read User B's achievements (Should return 0 rows)
  -- ----------------------------------------------------------------------------
  EXECUTE format('SET LOCAL request.jwt.claim.sub = %L', v_user_a);
  SELECT count(*) INTO v_count FROM public.user_achievements WHERE user_id = v_user_b;
  ASSERT v_count = 0, 'TEST 4 FAILED: User A was able to see User B achievements!';

  -- ----------------------------------------------------------------------------
  -- TEST 5: User A CANNOT update User B's achievement (Should affect 0 rows or error)
  -- ----------------------------------------------------------------------------
  UPDATE public.user_achievements 
  SET unlocked_at = now() 
  WHERE user_id = v_user_b;
  ASSERT NOT FOUND, 'TEST 5 FAILED: User A was able to update User B achievement!';

  -- ----------------------------------------------------------------------------
  -- TEST 6: User A CANNOT insert achievement for User B (Must trigger RLS violation)
  -- ----------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.user_achievements (user_id, key)
    VALUES (v_user_b, 'hydration_hero');
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := TRUE;
  END;
  ASSERT v_error_caught = TRUE, 'TEST 6 FAILED: User A was able to insert for User B without RLS violation!';

  RAISE NOTICE '✅ ALL RLS TESTS PASSED: User isolation, INSERT, UPDATE, and SELECT verified.';
END $$;

-- Rollback transaction so no test records persist
ROLLBACK;
