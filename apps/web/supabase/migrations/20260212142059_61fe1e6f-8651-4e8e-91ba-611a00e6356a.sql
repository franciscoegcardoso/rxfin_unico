
-- 1. Add confidence_level column
ALTER TABLE public.credit_card_transactions
ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT NULL;

-- 2. Helper: normalize store name in SQL
CREATE OR REPLACE FUNCTION public.normalize_store_name_sql(raw_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN TRIM(BOTH FROM
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(raw_name),
              '\*+', ' ', 'g'                         -- asterisks -> space
            ),
            '\s*\d{1,2}\s*[/\\]\s*\d{1,2}\s*', '', 'g' -- installment patterns 1/12, 02\10
          ),
          '\s*parc\.?\s*\d+\s*', '', 'gi'              -- "parc 3", "parc. 5"
        ),
        '\s*parcela\s*\d*\s*', '', 'gi'                 -- "parcela 3"
      ),
      '\s+', ' ', 'g'                                   -- collapse spaces
    )
  );
END;
$$;

-- 3. Main detection function
CREATE OR REPLACE FUNCTION public.detect_recurring_transactions(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_whitelist TEXT[] := ARRAY[
    -- Streaming video
    'netflix', 'disney+', 'disney plus', 'hbo', 'hbo max', 'max', 'amazon prime',
    'prime video', 'paramount', 'paramount+', 'globoplay', 'star+', 'starplus',
    'apple tv', 'crunchyroll', 'mubi', 'telecine',
    -- Streaming music
    'spotify', 'deezer', 'tidal', 'apple music', 'youtube music', 'youtube premium',
    'amazon music', 'audible',
    -- Cloud / storage
    'icloud', 'google one', 'google storage', 'dropbox', 'onedrive',
    -- Gaming
    'xbox', 'game pass', 'gamepass', 'playstation', 'ps plus', 'psplus',
    'nintendo', 'ea play', 'steam',
    -- Productivity / SaaS
    'chatgpt', 'openai', 'notion', 'canva', 'adobe', 'microsoft 365', 'office 365',
    'github', 'linkedin premium', 'grammarly', 'evernote', 'todoist',
    -- Education
    'coursera', 'duolingo', 'alura', 'udemy',
    -- Fitness / wellness
    'gympass', 'totalpass', 'strava', 'headspace', 'calm',
    -- Transport / mobility
    'sem parar', 'veloe', 'conectcar', 'move mais',
    -- Telecom
    'claro', 'vivo', 'tim', 'oi',
    -- Housing / bills
    'quinto andar', 'quintoandar', 'aluguel', 'condominio', 'condomínio',
    -- Delivery clubs
    'ifood club', 'rappi prime', 'rappi turbo',
    -- Insurance related
    'porto seguro', 'sulamerica', 'sulamérica', 'bradesco saude', 'bradesco saúde',
    'unimed', 'amil', 'hapvida',
    -- Internet
    'internet', 'banda larga', 'fibra'
  ];
  v_term TEXT;
  v_group_id UUID;
  v_very_high_count INT := 0;
  v_high_count INT := 0;
  v_medium_count INT := 0;
  v_low_count INT := 0;
  v_rec RECORD;
BEGIN
  -- ============================================================
  -- PASS 1: Whitelist detection (very_high)
  -- ============================================================
  -- Process each whitelist term
  FOREACH v_term IN ARRAY v_whitelist LOOP
    -- Check if any qualifying transactions match this term
    IF EXISTS (
      SELECT 1 FROM credit_card_transactions
      WHERE user_id = p_user_id
        AND COALESCE(installment_total, 1) <= 1
        AND normalize_store_name_sql(store_name) LIKE '%' || v_term || '%'
        AND (confidence_level IS NULL OR confidence_level NOT IN ('confirmed', 'dismissed'))
        AND store_name !~ '\d{1,2}\s*[/\\]\s*\d{1,2}'
    ) THEN
      v_group_id := gen_random_uuid();
      
      UPDATE credit_card_transactions
      SET is_recurring = true,
          confidence_level = 'very_high',
          recurring_group_id = v_group_id,
          updated_at = now()
      WHERE user_id = p_user_id
        AND COALESCE(installment_total, 1) <= 1
        AND normalize_store_name_sql(store_name) LIKE '%' || v_term || '%'
        AND (confidence_level IS NULL OR confidence_level NOT IN ('confirmed', 'dismissed'))
        AND store_name !~ '\d{1,2}\s*[/\\]\s*\d{1,2}';
      
      v_very_high_count := v_very_high_count + 1;
    END IF;
  END LOOP;

  -- ============================================================
  -- PASS 2: Statistical analysis (high / medium / low)
  -- ============================================================
  FOR v_rec IN
    WITH eligible AS (
      SELECT id, store_name, value, transaction_date,
             normalize_store_name_sql(store_name) AS norm_name, card_id
      FROM credit_card_transactions
      WHERE user_id = p_user_id
        AND COALESCE(installment_total, 1) <= 1
        AND (confidence_level IS NULL OR confidence_level NOT IN ('confirmed', 'dismissed', 'very_high'))
        AND store_name !~ '\d{1,2}\s*[/\\]\s*\d{1,2}'
    ),
    grouped AS (
      SELECT
        norm_name,
        card_id,
        COUNT(*) AS occurrence_count,
        AVG(value) AS avg_value,
        STDDEV_POP(value) AS stddev_value,
        ARRAY_AGG(transaction_date::DATE ORDER BY transaction_date) AS dates,
        ARRAY_AGG(id) AS tx_ids
      FROM eligible
      WHERE norm_name != '' AND LENGTH(norm_name) > 2
      GROUP BY norm_name, card_id
      HAVING COUNT(*) >= 2
    ),
    with_intervals AS (
      SELECT *,
        (
          SELECT AVG(d2 - d1)
          FROM (
            SELECT dates[i] AS d1, dates[i+1] AS d2
            FROM generate_series(1, array_length(dates, 1) - 1) AS i
          ) sub
        ) AS avg_interval_days
      FROM grouped
    )
    SELECT 
      norm_name, card_id, occurrence_count, avg_value, stddev_value,
      avg_interval_days, tx_ids,
      CASE
        WHEN occurrence_count >= 3 
             AND avg_interval_days BETWEEN 25 AND 35 
             AND (stddev_value IS NULL OR stddev_value / NULLIF(avg_value, 0) < 0.01)
          THEN 'high'
        WHEN occurrence_count >= 3 
             AND avg_interval_days BETWEEN 25 AND 35 
             AND stddev_value / NULLIF(avg_value, 0) >= 0.01
          THEN 'medium'
        WHEN occurrence_count = 2 
             AND avg_interval_days BETWEEN 25 AND 35
          THEN 'low'
        ELSE NULL
      END AS detected_level
    FROM with_intervals
  LOOP
    IF v_rec.detected_level IS NOT NULL THEN
      v_group_id := gen_random_uuid();
      
      UPDATE credit_card_transactions
      SET confidence_level = v_rec.detected_level,
          is_recurring = CASE WHEN v_rec.detected_level IN ('high') THEN true ELSE is_recurring END,
          recurring_group_id = v_group_id,
          updated_at = now()
      WHERE id = ANY(v_rec.tx_ids)
        AND (confidence_level IS NULL OR confidence_level NOT IN ('confirmed', 'dismissed', 'very_high'));
      
      CASE v_rec.detected_level
        WHEN 'high' THEN v_high_count := v_high_count + 1;
        WHEN 'medium' THEN v_medium_count := v_medium_count + 1;
        WHEN 'low' THEN v_low_count := v_low_count + 1;
        ELSE NULL;
      END CASE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'very_high', v_very_high_count,
    'high', v_high_count,
    'medium', v_medium_count,
    'low', v_low_count,
    'total', v_very_high_count + v_high_count + v_medium_count + v_low_count
  );
END;
$$;
