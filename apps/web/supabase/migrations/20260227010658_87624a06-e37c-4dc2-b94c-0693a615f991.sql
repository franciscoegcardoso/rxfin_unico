
CREATE TABLE public.onboarding_phase_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_phase_history_user_id ON public.onboarding_phase_history(user_id);
CREATE INDEX idx_onboarding_phase_history_phase ON public.onboarding_phase_history(phase);

ALTER TABLE public.onboarding_phase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read onboarding history"
  ON public.onboarding_phase_history FOR SELECT
  TO authenticated
  USING (public.is_admin((select auth.uid())));

CREATE POLICY "Users can read own onboarding history"
  ON public.onboarding_phase_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "System can insert onboarding history"
  ON public.onboarding_phase_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.track_onboarding_phase_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.onboarding_phase IS DISTINCT FROM NEW.onboarding_phase THEN
    UPDATE public.onboarding_phase_history
    SET ended_at = now()
    WHERE user_id = NEW.id
      AND phase = OLD.onboarding_phase
      AND ended_at IS NULL;

    INSERT INTO public.onboarding_phase_history (user_id, phase, started_at)
    VALUES (NEW.id, NEW.onboarding_phase, now());

    IF NEW.onboarding_phase = 'completed' AND OLD.crm_status IS DISTINCT FROM 'ativo' THEN
      NEW.crm_status := 'ativo';
      NEW.crm_status_changed_at := now();
      NEW.crm_status_updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_onboarding_phase
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_onboarding_phase_change();
