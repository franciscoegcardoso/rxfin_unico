-- Create email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all_users',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'processing', 'sent', 'failed'))
);

-- Create email unsubscribes table
CREATE TABLE public.email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns (admin only)
CREATE POLICY "Admins can view all campaigns"
ON public.email_campaigns FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create campaigns"
ON public.email_campaigns FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update campaigns"
ON public.email_campaigns FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete campaigns"
ON public.email_campaigns FOR DELETE
USING (is_admin(auth.uid()));

-- Policies for email_unsubscribes (admin only)
CREATE POLICY "Admins can view all unsubscribes"
ON public.email_unsubscribes FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can unsubscribe"
ON public.email_unsubscribes FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();