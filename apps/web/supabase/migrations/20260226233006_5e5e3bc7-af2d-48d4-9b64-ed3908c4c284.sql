
-- Phase 0: Add onboarding phase tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_phase text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS onboarding_control_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_control_phase text NOT NULL DEFAULT 'not_started';

-- Legacy migration: users who already completed onboarding get full completion
UPDATE profiles
SET onboarding_phase = 'completed',
    onboarding_control_done = true,
    onboarding_control_phase = 'completed'
WHERE onboarding_completed = true;
