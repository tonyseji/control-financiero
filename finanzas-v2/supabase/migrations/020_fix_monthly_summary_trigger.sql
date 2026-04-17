-- Migration: 020_fix_monthly_summary_trigger.sql
-- Replaces TO_CHAR(tx_date, 'YYYY-MM') = v_year_month with a date-range predicate.
-- Reason: TO_CHAR() on a date column is not sargable — it forces a full table scan
-- of all user transactions on every INSERT/UPDATE/DELETE. At production scale with
-- thousands of transactions this becomes a bottleneck on every write.
-- Fix: use tx_date BETWEEN v_month_start AND v_month_end, which allows Postgres
-- to use the composite index idx_tx_usr_date (added in 019) for an index range scan.
-- Logic is identical — only the access pattern changes.

CREATE OR REPLACE FUNCTION recalculate_monthly_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_month  TEXT;
  v_user_id     UUID;
  v_month_start DATE;
  v_month_end   DATE;
  v_income      DECIMAL;
  v_real_expense DECIMAL;
  v_savings     DECIMAL;
  v_savings_rate INT;
  v_categories  JSONB;
BEGIN
  v_user_id    := COALESCE(NEW.tx_usr_id, OLD.tx_usr_id);
  v_year_month := TO_CHAR(COALESCE(NEW.tx_date, OLD.tx_date), 'YYYY-MM');
  v_month_start := DATE_TRUNC('month', COALESCE(NEW.tx_date, OLD.tx_date))::DATE;
  v_month_end   := (DATE_TRUNC('month', COALESCE(NEW.tx_date, OLD.tx_date))
                    + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  WITH base AS (
    SELECT
      t.tx_amount,
      t.tx_type,
      c.cat_type
    FROM transactions t
    LEFT JOIN categories c ON t.tx_cat_id = c.cat_id
    WHERE t.tx_usr_id = v_user_id
      AND t.tx_date BETWEEN v_month_start AND v_month_end
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
      AND t.tx_date BETWEEN v_month_start AND v_month_end
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
  FROM totals tt
  LEFT JOIN category_breakdown cb ON true
  GROUP BY tt.total_income, tt.total_real_expense, tt.total_savings;

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
