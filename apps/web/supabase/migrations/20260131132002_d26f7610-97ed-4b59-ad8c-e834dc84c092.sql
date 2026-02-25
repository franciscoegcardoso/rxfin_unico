-- Add invitation_status to track pending guests
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'active' 
CHECK (invitation_status IN ('pending', 'active'));

-- Create guest_invitations table for tracking invitations
CREATE TABLE public.guest_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_email text NOT NULL,
  guest_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invitation_type text NOT NULL CHECK (invitation_type IN ('new_user', 'existing_user', 'transfer')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  previous_principal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  UNIQUE(principal_user_id, guest_email)
);

-- Enable RLS
ALTER TABLE public.guest_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for guest_invitations
CREATE POLICY "Principals can view their own invitations"
ON public.guest_invitations FOR SELECT
USING (auth.uid() = principal_user_id);

CREATE POLICY "Principals can create invitations"
ON public.guest_invitations FOR INSERT
WITH CHECK (auth.uid() = principal_user_id);

CREATE POLICY "Principals can update their own invitations"
ON public.guest_invitations FOR UPDATE
USING (auth.uid() = principal_user_id);

CREATE POLICY "Principals can delete their own invitations"
ON public.guest_invitations FOR DELETE
USING (auth.uid() = principal_user_id);

CREATE POLICY "Guests can view invitations sent to them"
ON public.guest_invitations FOR SELECT
USING (guest_user_id = auth.uid() OR guest_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Guests can update invitations sent to them"
ON public.guest_invitations FOR UPDATE
USING (guest_user_id = auth.uid() OR guest_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Admins can manage all invitations
CREATE POLICY "Admins can manage all invitations"
ON public.guest_invitations FOR ALL
USING (is_admin(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_guest_invitations_guest_email ON public.guest_invitations(guest_email);
CREATE INDEX idx_guest_invitations_token ON public.guest_invitations(token);
CREATE INDEX idx_guest_invitations_status ON public.guest_invitations(status);

-- Comment for documentation
COMMENT ON TABLE public.guest_invitations IS 'Tracks guest user invitations from principal users';
COMMENT ON COLUMN public.guest_invitations.invitation_type IS 'new_user: email not in system, existing_user: email exists unlinked, transfer: email linked to another principal';
COMMENT ON COLUMN public.profiles.invitation_status IS 'pending: waiting first access/confirmation, active: fully active user';