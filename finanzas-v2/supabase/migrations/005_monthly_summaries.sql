-- Migration: 005_monthly_summaries.sql
-- Pre-calculated monthly financial summaries for efficient advisor queries
-- Trigger automatically recalculates when transactions change

CREATE TABLE public.monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(prof_id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,  -- Format: "2026-04"
  summary JSONB NOT NULL,    -- { income, expense, savingsRate, categories: [...] }
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, year_month)
);

-- Index for fast lookups
CREATE INDEX idx_monthly_summaries_user_date
  ON public.monthly_summaries(user_id, year_month DESC);

-- RLS: each user can view their own summaries
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_summaries_own"
  ON public.monthly_summaries
  FOR SELECT
  USING (auth.uid() = user_id AND is_valid_user());

CREATE POLICY "monthly_summaries_admin"
  ON public.monthly_summaries
  FOR ALL
  USING (is_admin());

-- ============================================================
-- TRIGGER: Recalculate monthly summary when transaction changes
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_monthly_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_month TEXT;
  v_user_id UUID;
  v_income DECIMAL;
  v_expense DECIMAL;
  v_savings_rate INT;
  v_categories JSONB;
BEGIN
  -- Determine which transaction triggered this (NEW on insert/update, OLD on delete)
  v_user_id := COALESCE(NEW.tx_usr_id, OLD.tx_usr_id);
  v_year_month := TO_CHAR(COALESCE(NEW.tx_date, OLD.tx_date), 'YYYY-MM');

  -- Calculate monthly totals (excluding transfers: tx_transfer_pair_id IS NULL)
  WITH month_data AS (
    SELECT
      COALESCE(SUM(CASE WHEN tx_type = 'income' THEN tx_amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN tx_type = 'expense' THEN tx_amount ELSE 0 END), 0) as total_expense
    FROM transactions
    WHERE tx_usr_id = v_user_id
      AND TO_CHAR(tx_date, 'YYYY-MM') = v_year_month
      AND tx_transfer_pair_id IS NULL
  ),
  category_breakdown AS (
    SELECT
      c.cat_name,
      COALESCE(SUM(t.tx_amount), 0) as cat_total
    FROM transactions t
    LEFT JOIN categories c ON t.tx_cat_id = c.cat_id
    WHERE t.tx_usr_id = v_user_id
      AND TO_CHAR(t.tx_date, 'YYYY-MM') = v_year_month
      AND t.tx_type = 'expense'
      AND t.tx_transfer_pair_id IS NULL
    GROUP BY c.cat_name
    ORDER BY cat_total DESC
    LIMIT 10
  )
  SELECT
    md.total_income,
    md.total_expense,
    CASE
      WHEN md.total_income > 0 THEN
        ROUND(((md.total_income - md.total_expense) / md.total_income * 100)::NUMERIC, 0)::INT
      ELSE 0
    END as rate,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'name', cb.cat_name,
          'total', ROUND(cb.cat_total::NUMERIC, 2),
          'percentage', CASE
            WHEN md.total_expense > 0 THEN ROUND((cb.cat_total / md.total_expense * 100)::NUMERIC, 0)::INT
            ELSE 0
          END
        )
      ) FILTER (WHERE cb.cat_name IS NOT NULL),
      '[]'::JSONB
    )
  INTO v_income, v_expense, v_savings_rate, v_categories
  FROM month_data md, category_breakdown cb;

  -- Upsert summary
  INSERT INTO monthly_summaries (user_id, year_month, summary, calculated_at)
  VALUES (
    v_user_id,
    v_year_month,
    JSONB_BUILD_OBJECT(
      'income', v_income,
      'expense', v_expense,
      'savingsRate', v_savings_rate,
      'categories', v_categories
    ),
    NOW()
  )
  ON CONFLICT (user_id, year_month)
  DO UPDATE SET
    summary = EXCLUDED.summary,
    calculated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on transactions: insert, update, delete
CREATE TRIGGER trigger_recalc_monthly_summary_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION recalculate_monthly_summary();

CREATE TRIGGER trigger_recalc_monthly_summary_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION recalculate_monthly_summary();

CREATE TRIGGER trigger_recalc_monthly_summary_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION recalculate_monthly_summary();
