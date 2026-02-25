-- Create email_templates table for automated email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'transactional',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON COLUMN public.email_templates.trigger_type IS 'manual, event, scheduled';
COMMENT ON COLUMN public.email_templates.trigger_config IS 'Configuration for scheduled triggers (cron, day_of_month, etc)';
COMMENT ON COLUMN public.email_templates.variables IS 'Available template variables like {{name}}, {{email}}';

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies - Only admins can manage templates
CREATE POLICY "Admins can view all templates" 
ON public.email_templates 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create templates" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update templates" 
ON public.email_templates 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete templates" 
ON public.email_templates 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();