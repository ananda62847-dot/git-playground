-- Grievances table (if not exists)
CREATE TABLE IF NOT EXISTS public.grievances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  city TEXT NOT NULL,
  constituency TEXT,
  area TEXT,
  polling_booth TEXT,
  pincode TEXT NOT NULL,
  occupation TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  sub_categories TEXT[] DEFAULT '{}',
  grievance TEXT NOT NULL,
  sentiment TEXT DEFAULT 'neutral',
  sentiment_score DECIMAL(3,2) DEFAULT 0.5,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volunteers table (if not exists)
CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  constituency TEXT,
  area TEXT,
  polling_booth TEXT,
  interests TEXT[] DEFAULT '{}',
  availability TEXT,
  submission_id UUID,
  submission_type TEXT DEFAULT 'suggestion',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add sentiment columns to suggestions table
ALTER TABLE public.suggestions 
ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS polling_booth TEXT;

-- Areas by constituency
CREATE TABLE IF NOT EXISTS public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  constituency TEXT NOT NULL,
  area_name TEXT NOT NULL,
  polling_booths TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can insert grievances" ON public.grievances;
DROP POLICY IF EXISTS "Admins can view all grievances" ON public.grievances;
DROP POLICY IF EXISTS "Admins can update grievances" ON public.grievances;
DROP POLICY IF EXISTS "Anyone can insert volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Admins can view volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Anyone can read areas" ON public.areas;
DROP POLICY IF EXISTS "Admins can manage areas" ON public.areas;

-- Create policies
CREATE POLICY "Anyone can insert grievances" ON public.grievances FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all grievances" ON public.grievances FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'moderator')));
CREATE POLICY "Admins can update grievances" ON public.grievances FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'moderator')));

CREATE POLICY "Anyone can insert volunteers" ON public.volunteers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view volunteers" ON public.volunteers FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'moderator')));

CREATE POLICY "Anyone can read areas" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Admins can manage areas" ON public.areas FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Insert sample areas
INSERT INTO public.areas (city, constituency, area_name, polling_booths) VALUES
('Chennai / சென்னை', 'Alandur / ஆலந்தூர்', 'Alandur Main / ஆலந்தூர் மெயின்', ARRAY['Booth 1', 'Booth 2', 'Booth 3']),
('Chennai / சென்னை', 'Alandur / ஆலந்தூர்', 'Adambakkam / அடம்பாக்கம்', ARRAY['Booth 4', 'Booth 5', 'Booth 6']),
('Chennai / சென்னை', 'Alandur / ஆலந்தூர்', 'Nanganallur / நாங்கனல்லூர்', ARRAY['Booth 7', 'Booth 8']),
('Chennai / சென்னை', 'Velachery / வேளச்சேரி', 'Velachery Main / வேளச்சேரி மெயின்', ARRAY['Booth 1', 'Booth 2']),
('Chennai / சென்னை', 'Velachery / வேளச்சேரி', 'Taramani / தரமணி', ARRAY['Booth 3', 'Booth 4']),
('Chennai / சென்னை', 'T.Nagar / தியாகராய நகர்', 'T.Nagar Main / தியாகராய நகர் மெயின்', ARRAY['Booth 1', 'Booth 2', 'Booth 3']),
('Chennai / சென்னை', 'Anna Nagar / அண்ணா நகர்', 'Anna Nagar West / அண்ணா நகர் மேற்கு', ARRAY['Booth 1', 'Booth 2']),
('Coimbatore / கோயம்புத்தூர்', 'Coimbatore North / கோயம்புத்தூர் வடக்கு', 'Gandhipuram / காந்திபுரம்', ARRAY['Booth 1', 'Booth 2']),
('Madurai / மதுரை', 'Madurai Central / மதுரை மத்தி', 'Meenakshi Temple Area / மீனாட்சி கோவில் பகுதி', ARRAY['Booth 1', 'Booth 2']);

-- Triggers
DROP TRIGGER IF EXISTS update_grievances_updated_at ON public.grievances;
CREATE TRIGGER update_grievances_updated_at BEFORE UPDATE ON public.grievances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_volunteers_updated_at ON public.volunteers;
CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();