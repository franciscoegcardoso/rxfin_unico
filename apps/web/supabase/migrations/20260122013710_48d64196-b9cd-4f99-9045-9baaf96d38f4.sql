-- Create table for people to gift
CREATE TABLE public.gift_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  birthday_day INTEGER,
  birthday_month INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for gift events/occasions
CREATE TABLE public.gift_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'birthday', 'christmas', 'mothers_day', 'fathers_day', 'easter', 'childrens_day', 'custom'
  event_day INTEGER, -- day of month (null for birthday which uses person's date)
  event_month INTEGER, -- month (null for birthday)
  default_value NUMERIC NOT NULL DEFAULT 100,
  is_system_event BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for gift assignments (linking people to events with specific values)
CREATE TABLE public.gift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES public.gift_people(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.gift_events(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  planned_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'purchased', 'delivered'
  gift_description TEXT,
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(person_id, event_id, year)
);

-- Enable RLS
ALTER TABLE public.gift_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for gift_people
CREATE POLICY "Users can view their own gift people" ON public.gift_people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gift people" ON public.gift_people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gift people" ON public.gift_people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gift people" ON public.gift_people FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for gift_events
CREATE POLICY "Users can view their own gift events" ON public.gift_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gift events" ON public.gift_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gift events" ON public.gift_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gift events" ON public.gift_events FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for gift_assignments
CREATE POLICY "Users can view their own gift assignments" ON public.gift_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gift assignments" ON public.gift_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gift assignments" ON public.gift_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gift assignments" ON public.gift_assignments FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_gift_people_updated_at BEFORE UPDATE ON public.gift_people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gift_events_updated_at BEFORE UPDATE ON public.gift_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gift_assignments_updated_at BEFORE UPDATE ON public.gift_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();