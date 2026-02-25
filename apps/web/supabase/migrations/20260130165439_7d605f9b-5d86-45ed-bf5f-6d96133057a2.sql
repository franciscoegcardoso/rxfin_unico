-- Drop the old simulators table
DROP TABLE IF EXISTS public.simulators;

-- Create the new pages table with separate activation for users and admins
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    order_index INTEGER DEFAULT 0,
    access_level TEXT NOT NULL DEFAULT 'admin' CHECK (access_level IN ('public', 'free', 'premium', 'admin')),
    is_active_users BOOLEAN NOT NULL DEFAULT false,
    is_active_admin BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the page_features table for customizable features within pages
CREATE TABLE public.page_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    access_level TEXT NOT NULL DEFAULT 'admin' CHECK (access_level IN ('public', 'free', 'premium', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(page_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_features ENABLE ROW LEVEL SECURITY;

-- Pages: public read, admin-only write
CREATE POLICY "Pages are viewable by everyone" 
ON public.pages FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert pages" 
ON public.pages FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update pages" 
ON public.pages FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete pages" 
ON public.pages FOR DELETE 
USING (is_admin(auth.uid()));

-- Page features: public read, admin-only write
CREATE POLICY "Page features are viewable by everyone" 
ON public.page_features FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert page features" 
ON public.page_features FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update page features" 
ON public.page_features FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete page features" 
ON public.page_features FOR DELETE 
USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_features_updated_at
BEFORE UPDATE ON public.page_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();