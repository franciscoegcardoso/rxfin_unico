-- Create page_groups table
CREATE TABLE public.page_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    is_collapsible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add group_id to pages table
ALTER TABLE public.pages 
ADD COLUMN group_id UUID REFERENCES public.page_groups(id) ON DELETE SET NULL,
ADD COLUMN order_in_group INTEGER DEFAULT 0;

-- Enable RLS on page_groups
ALTER TABLE public.page_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_groups
CREATE POLICY "Page groups are viewable by everyone"
ON public.page_groups
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert page groups"
ON public.page_groups
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update page groups"
ON public.page_groups
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete page groups"
ON public.page_groups
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_page_groups_updated_at
BEFORE UPDATE ON public.page_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();