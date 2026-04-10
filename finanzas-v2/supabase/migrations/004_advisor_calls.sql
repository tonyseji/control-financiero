-- Migration: 004_advisor_calls.sql
-- Rate limiting table for AI financial advisor (5 calls/day per user)

CREATE TABLE public.advisor_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INT NOT NULL DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: one record per user/day
  UNIQUE(user_id, call_date)
);

-- Index for fast lookups
CREATE INDEX idx_advisor_calls_user_date
  ON public.advisor_calls(user_id, call_date);

-- RLS: each user can view their own counter
ALTER TABLE public.advisor_calls ENABLE ROW LEVEL SECURITY;

-- Atomic increment function — eliminates TOCTOU race in rate limiting.
-- Returns the NEW call_count after increment, or NULL if limit already reached.
-- Uses INSERT ... ON CONFLICT to ensure atomicity under concurrent requests.
CREATE OR REPLACE FUNCTION increment_advisor_call(
  p_user_id UUID,
  p_date    DATE,
  p_limit   INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INT;
BEGIN
  -- Check current count before incrementing
  SELECT call_count INTO v_new_count
  FROM advisor_calls
  WHERE user_id = p_user_id AND call_date = p_date;

  IF v_new_count >= p_limit THEN
    RETURN NULL; -- Limit already hit, do not increment
  END IF;

  INSERT INTO advisor_calls (user_id, call_date, call_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET
    call_count = advisor_calls.call_count + 1,
    updated_at = NOW()
  WHERE advisor_calls.call_count < p_limit
  RETURNING call_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

CREATE POLICY "advisor_calls_own"
  ON public.advisor_calls
  FOR SELECT
  USING (auth.uid() = user_id AND is_valid_user());

CREATE POLICY "advisor_calls_admin"
  ON public.advisor_calls
  FOR ALL
  USING (is_admin());
