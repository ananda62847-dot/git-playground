-- Add moderator_constituencies table for constituency-based access
CREATE TABLE public.moderator_constituencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderator_constituencies ENABLE ROW LEVEL SECURITY;

-- Only admins can manage moderator constituencies
CREATE POLICY "Admins can manage moderator constituencies" ON public.moderator_constituencies
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own constituencies
CREATE POLICY "Users can view own constituencies" ON public.moderator_constituencies
FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage user_roles
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update suggestions policy to allow moderators to view their constituency data
DROP POLICY IF EXISTS "Admins can view all suggestions" ON public.suggestions;
CREATE POLICY "Admins and moderators can view suggestions" ON public.suggestions
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'moderator'::app_role) AND (
    constituency IN (SELECT constituency FROM moderator_constituencies WHERE user_id = auth.uid())
    OR constituency IS NULL
  ))
);

-- Update grievances policies for moderator access
DROP POLICY IF EXISTS "Admins can view all grievances" ON public.grievances;
CREATE POLICY "Admins and moderators can view grievances" ON public.grievances
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role) OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'moderator'::app_role) AND (
    constituency IN (SELECT constituency FROM moderator_constituencies WHERE user_id = auth.uid())
    OR constituency IS NULL
  ))
);

DROP POLICY IF EXISTS "Admins can update grievances" ON public.grievances;
CREATE POLICY "Admins and moderators can update grievances" ON public.grievances
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role) OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'moderator'::app_role) AND (
    constituency IN (SELECT constituency FROM moderator_constituencies WHERE user_id = auth.uid())
  ))
);

-- Update volunteers policies for moderator access
DROP POLICY IF EXISTS "Admins can view volunteers" ON public.volunteers;
CREATE POLICY "Admins and moderators can view volunteers" ON public.volunteers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role) OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'moderator'::app_role) AND (
    constituency IN (SELECT constituency FROM moderator_constituencies WHERE user_id = auth.uid())
    OR constituency IS NULL
  ))
);

-- Insert more sample area data for various cities
INSERT INTO public.areas (city, constituency, area_name, polling_booths) VALUES
-- Salem
('Salem / சேலம்', 'Salem North / சேலம் வடக்கு', 'Ammapet', ARRAY['Booth 1 - Government School', 'Booth 2 - Community Hall', 'Booth 3 - Primary School']),
('Salem / சேலம்', 'Salem North / சேலம் வடக்கு', 'Shevapet', ARRAY['Booth 1 - Municipal Office', 'Booth 2 - Town Hall']),
('Salem / சேலம்', 'Salem South / சேலம் தெற்கு', 'Fairlands', ARRAY['Booth 1 - Engineering College', 'Booth 2 - Arts College']),
('Salem / சேலம்', 'Salem South / சேலம் தெற்கு', 'Hasthampatti', ARRAY['Booth 1 - Government Hospital', 'Booth 2 - Primary School']),

-- Tiruchirappalli
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Srirangam / ஸ்ரீரங்கம்', 'Srirangam Town', ARRAY['Booth 1 - Temple Complex', 'Booth 2 - Municipal School', 'Booth 3 - Community Center']),
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Srirangam / ஸ்ரீரங்கம்', 'Thiruvanaikaval', ARRAY['Booth 1 - Primary School', 'Booth 2 - Government Office']),
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Tiruchirappalli East / திருச்சி கிழக்கு', 'Cantonment', ARRAY['Booth 1 - Railway Station Hall', 'Booth 2 - Government School']),
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Tiruchirappalli West / திருச்சி மேற்கு', 'Thillai Nagar', ARRAY['Booth 1 - Community Hall', 'Booth 2 - Corporation School', 'Booth 3 - Private Hall']),

-- Vellore
('Vellore / வேலூர்', 'Vellore / வேலூர்', 'Vellore Fort', ARRAY['Booth 1 - Fort Complex', 'Booth 2 - Town Hall']),
('Vellore / வேலூர்', 'Vellore / வேலூர்', 'Sathuvachari', ARRAY['Booth 1 - Government School', 'Booth 2 - Community Hall']),
('Vellore / வேலூர்', 'Katpadi / காட்பாடி', 'Katpadi Town', ARRAY['Booth 1 - Railway Station', 'Booth 2 - Municipal Office']),
('Vellore / வேலூர்', 'Gudiyatham / குடியாத்தம்', 'Gudiyatham', ARRAY['Booth 1 - Town Hall', 'Booth 2 - Primary School']),

-- Erode
('Erode / ஈரோடு', 'Erode East / ஈரோடு கிழக்கு', 'Perundurai Road', ARRAY['Booth 1 - Government College', 'Booth 2 - Municipal School']),
('Erode / ஈரோடு', 'Erode West / ஈரோடு மேற்கு', 'Surampatti', ARRAY['Booth 1 - Community Hall', 'Booth 2 - Primary School']),
('Erode / ஈரோடு', 'Bhavani / பவானி', 'Bhavani Town', ARRAY['Booth 1 - Temple Hall', 'Booth 2 - Government Office']),

-- Tiruppur
('Tiruppur / திருப்பூர்', 'Tiruppur North / திருப்பூர் வடக்கு', 'Angeripalayam', ARRAY['Booth 1 - Industrial School', 'Booth 2 - Community Center']),
('Tiruppur / திருப்பூர்', 'Tiruppur South / திருப்பூர் தெற்கு', 'Kumaran Road', ARRAY['Booth 1 - Town Hall', 'Booth 2 - Corporation Office']),
('Tiruppur / திருப்பூர்', 'Avanashi / அவனாசி', 'Avanashi Town', ARRAY['Booth 1 - Government School', 'Booth 2 - Primary School']),

-- Thanjavur
('Thanjavur / தஞ்சாவூர்', 'Thanjavur / தஞ்சாவூர்', 'Big Temple Area', ARRAY['Booth 1 - Temple Complex', 'Booth 2 - Town Hall']),
('Thanjavur / தஞ்சாவூர்', 'Thanjavur / தஞ்சாவூர்', 'Railway Station Area', ARRAY['Booth 1 - Railway Hall', 'Booth 2 - Government School']),
('Thanjavur / தஞ்சாவூர்', 'Kumbakonam / கும்பகோணம்', 'Kumbakonam Town', ARRAY['Booth 1 - Temple Hall', 'Booth 2 - Municipal Office', 'Booth 3 - College Hall']),

-- Tirunelveli
('Tirunelveli / திருநெல்வேலி', 'Tirunelveli / திருநெல்வேலி', 'Palayamkottai', ARRAY['Booth 1 - St. Johns College', 'Booth 2 - Government School']),
('Tirunelveli / திருநெல்வேலி', 'Tirunelveli / திருநெல்வேலி', 'Junction Area', ARRAY['Booth 1 - Railway Station', 'Booth 2 - Town Hall']),
('Tirunelveli / திருநெல்வேலி', 'Ambasamudram / அம்பாசமுத்திரம்', 'Ambasamudram Town', ARRAY['Booth 1 - Government School', 'Booth 2 - Temple Hall']),

-- Dindigul
('Dindigul / திண்டுக்கல்', 'Dindigul / திண்டுக்கல்', 'Dindigul Town', ARRAY['Booth 1 - Rock Fort Area', 'Booth 2 - Municipal Office']),
('Dindigul / திண்டுக்கல்', 'Palani / பழனி', 'Palani Town', ARRAY['Booth 1 - Temple Area', 'Booth 2 - Government School', 'Booth 3 - Town Hall']),

-- Krishnagiri
('Krishnagiri / கிருஷ்ணகிரி', 'Krishnagiri / கிருஷ்ணகிரி', 'Krishnagiri Town', ARRAY['Booth 1 - Fort Area', 'Booth 2 - Municipal Office']),
('Krishnagiri / கிருஷ்ணகிரி', 'Hosur / ஓசூர்', 'Hosur Town', ARRAY['Booth 1 - Industrial Area', 'Booth 2 - Town Hall', 'Booth 3 - Government School']),

-- Nagercoil
('Nagercoil / நாகர்கோவில்', 'Nagercoil / நாகர்கோவில்', 'Nagercoil Town', ARRAY['Booth 1 - Municipal Office', 'Booth 2 - Government School']),
('Nagercoil / நாகர்கோவில்', 'Kanyakumari / கன்னியாகுமரி', 'Kanyakumari Town', ARRAY['Booth 1 - Beach Area', 'Booth 2 - Temple Complex'])
ON CONFLICT DO NOTHING;