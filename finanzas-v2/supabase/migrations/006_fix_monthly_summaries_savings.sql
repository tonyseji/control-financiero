-- Migration: 006_fix_monthly_summaries_savings.sql
-- Fix: savingsRate was 0 for months where savings/investment transactions exist,
-- because they were recorded as tx_type='expense' with cat_type='saving'|'investment'.
-- Now we correctly separate real expenses from savings/investments.
--
-- Changes to summary JSONB:
--   income     → unchanged
--   expense    → only real expenses (cat_type IN fixed_expense, variable_expense, or NULL)
--   savings    → NEW: total amount in saving/investment categories
--   savingsRate→ savings / income * 100 (was (income-expense)/income*100)
--   categories → only real expense categories (saving/investment excluded)

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
  v_real_expense DECIMAL;
  v_savings DECIMAL;
  v_savings_rate INT;
  v_categories JSONB;
BEGIN
  v_user_id    := COALESCE(NEW.tx_usr_id, OLD.tx_usr_id);
  v_year_month := TO_CHAR(COALESCE(NEW.tx_date, OLD.tx_date), 'YYYY-MM');

  WITH base AS (
    SELECT
      t.tx_amount,
      t.tx_type,
      c.cat_type
    FROM transactions t
    LEFT JOIN categories c ON t.tx_cat_id = c.cat_id
    WHERE t.tx_usr_id = v_user_id
      AND TO_CHAR(t.tx_date, 'YYYY-MM') = v_year_month
      AND t.tx_transfer_pair_id IS NULL
  ),
  totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN tx_type = 'income' THEN tx_amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE
        WHEN tx_type = 'expense'
          AND cat_type NOT IN ('saving', 'investment') THEN tx_amount
        ELSE 0
      END), 0) AS total_real_expense,
      COALESCE(SUM(CASE
        WHEN tx_type = 'expense'
          AND cat_type IN ('saving', 'investment') THEN tx_amount
        ELSE 0
      END), 0) AS total_savings
    FROM base
  ),
  category_breakdown AS (
    SELECT
      c.cat_name,
      COALESCE(SUM(t.tx_amount), 0) AS cat_total
    FROM transactions t
    LEFT JOIN categories c ON t.tx_cat_id = c.cat_id
    WHERE t.tx_usr_id = v_user_id
      AND TO_CHAR(t.tx_date, 'YYYY-MM') = v_year_month
      AND t.tx_type = 'expense'
      AND t.tx_transfer_pair_id IS NULL
      AND c.cat_type NOT IN ('saving', 'investment')
    GROUP BY c.cat_name
    ORDER BY cat_total DESC
    LIMIT 10
  )
  SELECT
    tt.total_income,
    tt.total_real_expense,
    tt.total_savings,
    CASE
      WHEN tt.total_income > 0 THEN
        ROUND((tt.total_savings / tt.total_income * 100)::NUMERIC, 0)::INT
      ELSE 0
    END,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'name', cb.cat_name,
          'total', ROUND(cb.cat_total::NUMERIC, 2),
          'percentage', CASE
            WHEN tt.total_real_expense > 0
              THEN ROUND((cb.cat_total / tt.total_real_expense * 100)::NUMERIC, 0)::INT
            ELSE 0
          END
        )
      ) FILTER (WHERE cb.cat_name IS NOT NULL),
      '[]'::JSONB
    )
  INTO v_income, v_real_expense, v_savings, v_savings_rate, v_categories
  FROM totals tt, category_breakdown cb;

  INSERT INTO monthly_summaries (user_id, year_month, summary, calculated_at)
  VALUES (
    v_user_id,
    v_year_month,
    JSONB_BUILD_OBJECT(
      'income',      v_income,
      'expense',     v_real_expense,
      'savings',     v_savings,
      'savingsRate', v_savings_rate,
      'categories',  v_categories
    ),
    NOW()
  )
  ON CONFLICT (user_id, year_month)
  DO UPDATE SET
    summary       = EXCLUDED.summary,
    calculated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;
