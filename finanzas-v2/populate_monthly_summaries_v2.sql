-- Repoblar monthly_summaries con savingsRate correcto
-- savings = transacciones expense con cat_type IN ('saving', 'investment')
-- expense = transacciones expense con cat_type NOT IN ('saving', 'investment')
-- savingsRate = savings / income * 100

WITH base AS (
  SELECT
    t.tx_usr_id AS user_id,
    TO_CHAR(t.tx_date, 'YYYY-MM') AS year_month,
    t.tx_amount,
    t.tx_type,
    c.cat_type,
    c.cat_name
  FROM transactions t
  LEFT JOIN categories c ON t.tx_cat_id = c.cat_id
  WHERE t.tx_transfer_pair_id IS NULL
    AND (t.tx_is_demo = false OR t.tx_is_demo IS NULL)
),
totals AS (
  SELECT
    user_id,
    year_month,
    COALESCE(SUM(CASE WHEN tx_type = 'income' THEN tx_amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE
      WHEN tx_type = 'expense' AND cat_type NOT IN ('saving', 'investment') THEN tx_amount
      ELSE 0
    END), 0) AS total_real_expense,
    COALESCE(SUM(CASE
      WHEN tx_type = 'expense' AND cat_type IN ('saving', 'investment') THEN tx_amount
      ELSE 0
    END), 0) AS total_savings
  FROM base
  GROUP BY user_id, year_month
),
category_totals AS (
  SELECT
    user_id,
    year_month,
    cat_name,
    SUM(tx_amount) AS cat_total
  FROM base
  WHERE tx_type = 'expense'
    AND cat_type NOT IN ('saving', 'investment')
  GROUP BY user_id, year_month, cat_name
),
categories_json AS (
  SELECT
    ct.user_id,
    ct.year_month,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'name', ct.cat_name,
        'total', ROUND(ct.cat_total::NUMERIC, 2),
        'percentage', CASE
          WHEN t.total_real_expense > 0
            THEN ROUND((ct.cat_total / t.total_real_expense * 100)::NUMERIC, 0)::INT
          ELSE 0
        END
      )
      ORDER BY ct.cat_total DESC
    ) AS categories_array
  FROM category_totals ct
  JOIN totals t ON ct.user_id = t.user_id AND ct.year_month = t.year_month
  GROUP BY ct.user_id, ct.year_month
)
INSERT INTO monthly_summaries (user_id, year_month, summary, calculated_at)
SELECT
  t.user_id,
  t.year_month,
  JSONB_BUILD_OBJECT(
    'income',      ROUND(t.total_income::NUMERIC, 2),
    'expense',     ROUND(t.total_real_expense::NUMERIC, 2),
    'savings',     ROUND(t.total_savings::NUMERIC, 2),
    'savingsRate', CASE
      WHEN t.total_income > 0
        THEN ROUND((t.total_savings / t.total_income * 100)::NUMERIC, 0)::INT
      ELSE 0
    END,
    'categories',  COALESCE(cj.categories_array, '[]'::JSONB)
  ),
  NOW()
FROM totals t
LEFT JOIN categories_json cj ON t.user_id = cj.user_id AND t.year_month = cj.year_month
ON CONFLICT (user_id, year_month)
DO UPDATE SET summary = EXCLUDED.summary, calculated_at = NOW();
