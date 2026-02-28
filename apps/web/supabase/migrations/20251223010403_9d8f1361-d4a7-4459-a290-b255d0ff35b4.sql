-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'shared_user', 'driver');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    workspace_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role, workspace_owner_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role app_role NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (email, invited_by, role)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create driver_vehicle_access table for vehicle-specific access
CREATE TABLE public.driver_vehicle_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vehicle_id TEXT NOT NULL,
    workspace_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (driver_user_id, vehicle_id, workspace_owner_id)
);

ALTER TABLE public.driver_vehicle_access ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _workspace_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND workspace_owner_id = _workspace_owner_id
  )
$$;

-- Function to check if user has vehicle access
CREATE OR REPLACE FUNCTION public.has_vehicle_access(_user_id UUID, _vehicle_id TEXT, _workspace_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.driver_vehicle_access
    WHERE driver_user_id = _user_id
      AND vehicle_id = _vehicle_id
      AND workspace_owner_id = _workspace_owner_id
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = workspace_owner_id);

CREATE POLICY "Workspace owners can manage roles"
ON public.user_roles
FOR ALL
USING (auth.uid() = workspace_owner_id);

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations they created"
ON public.invitations
FOR SELECT
USING (auth.uid() = invited_by);

CREATE POLICY "Users can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update their own invitations"
ON public.invitations
FOR UPDATE
USING (auth.uid() = invited_by);

CREATE POLICY "Users can delete their own invitations"
ON public.invitations
FOR DELETE
USING (auth.uid() = invited_by);

-- RLS Policies for driver_vehicle_access
CREATE POLICY "Workspace owners can manage vehicle access"
ON public.driver_vehicle_access
FOR ALL
USING (auth.uid() = workspace_owner_id);

CREATE POLICY "Drivers can view their own vehicle access"
ON public.driver_vehicle_access
FOR SELECT
USING (auth.uid() = driver_user_id);