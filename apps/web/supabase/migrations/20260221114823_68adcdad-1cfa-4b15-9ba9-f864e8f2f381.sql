-- 1. Add sync_date column
ALTER TABLE public.pluggy_sync_jobs
ADD COLUMN IF NOT EXISTS sync_date date DEFAULT CURRENT_DATE;

-- 2. Backfill existing rows
UPDATE public.pluggy_sync_jobs
SET sync_date = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE sync_date IS NULL;

-- 3. Unique index to prevent duplicates per user per day
CREATE UNIQUE INDEX IF NOT EXISTS pluggy_sync_jobs_user_sync_date_uniq_idx
ON public.pluggy_sync_jobs (user_id, sync_date)
WHERE action = 'daily_auto';

-- 4. RPC function: check_and_create_sync_job
CREATE OR REPLACE FUNCTION public.check_and_create_sync_job(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
  v_item_id text;
BEGIN
  -- Check if a daily sync job already exists for today
  SELECT id INTO v_existing_id
  FROM pluggy_sync_jobs
  WHERE user_id = p_user_id
    AND sync_date = CURRENT_DATE
    AND action = 'daily_auto'
    AND status IN ('pending', 'running', 'done');

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('created', false, 'reason', 'already_exists', 'job_id', v_existing_id);
  END IF;

  -- Get the user's primary pluggy connection item_id
  SELECT item_id INTO v_item_id
  FROM pluggy_connections
  WHERE user_id = p_user_id
    AND status = 'UPDATED'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_item_id IS NULL THEN
    RETURN jsonb_build_object('created', false, 'reason', 'no_active_connection');
  END IF;

  -- Insert new daily sync job
  INSERT INTO pluggy_sync_jobs (user_id, item_id, action, status, priority, sync_date)
  VALUES (p_user_id, v_item_id, 'daily_auto', 'pending', 3, CURRENT_DATE)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RETURN jsonb_build_object('created', false, 'reason', 'conflict');
  END IF;

  RETURN jsonb_build_object('created', true, 'job_id', v_new_id);
END;
$$;