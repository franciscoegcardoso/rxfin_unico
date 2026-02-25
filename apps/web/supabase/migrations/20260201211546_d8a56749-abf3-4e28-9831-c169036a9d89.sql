-- Create email_campaign_recipients table for individual send tracking
CREATE TABLE public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint for valid status values
  CONSTRAINT valid_recipient_status CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'))
);

-- Enable RLS
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can access
CREATE POLICY "Admins can view all campaign recipients"
  ON public.email_campaign_recipients
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert campaign recipients"
  ON public.email_campaign_recipients
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update campaign recipients"
  ON public.email_campaign_recipients
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete campaign recipients"
  ON public.email_campaign_recipients
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Performance indexes
CREATE INDEX idx_recipients_campaign_id ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_recipients_user_id ON public.email_campaign_recipients(user_id);
CREATE INDEX idx_recipients_email ON public.email_campaign_recipients(email);
CREATE INDEX idx_recipients_status ON public.email_campaign_recipients(status);

-- Add comment for documentation
COMMENT ON TABLE public.email_campaign_recipients IS 'Tracks individual email sends per campaign with delivery and engagement status';