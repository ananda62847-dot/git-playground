-- Clean up duplicate/old permissive policies and add more sample areas

DO $$
BEGIN
  -- Remove old permissive policies
  BEGIN EXECUTE 'DROP POLICY "Anyone can submit suggestions" ON public.suggestions'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Anyone can insert grievances" ON public.grievances'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Anyone can insert volunteers" ON public.volunteers'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Anyone can read areas" ON public.areas'; EXCEPTION WHEN undefined_object THEN END;
END $$;

-- Insert more sample area data for various cities
INSERT INTO public.areas (city, constituency, area_name, polling_booths) VALUES
-- More Chennai areas
('Chennai / சென்னை', 'Alandur / ஆலந்தூர்', 'Nanganallur', ARRAY['Booth 1 - Govt School', 'Booth 2 - Community Hall', 'Booth 3 - Temple']),
('Chennai / சென்னை', 'Alandur / ஆலந்தூர்', 'Adambakkam', ARRAY['Booth 1 - School', 'Booth 2 - Library']),
('Chennai / சென்னை', 'Tambaram / தாம்பரம்', 'Chromepet', ARRAY['Booth 1 - School', 'Booth 2 - College']),
('Chennai / சென்னை', 'Tambaram / தாம்பரம்', 'Pallavaram', ARRAY['Booth 1 - Govt School', 'Booth 2 - Temple']),
('Chennai / சென்னை', 'Velachery / வேளச்சேரி', 'Velachery Main', ARRAY['Booth 1 - School', 'Booth 2 - Community Center']),
('Chennai / சென்னை', 'Velachery / வேளச்சேரி', 'Taramani', ARRAY['Booth 1 - IIT Gate', 'Booth 2 - School']),
('Chennai / சென்னை', 'Sholinganallur / சோழிங்கநல்லூர்', 'OMR Thoraipakkam', ARRAY['Booth 1 - Tech Park', 'Booth 2 - School']),
('Chennai / சென்னை', 'Sholinganallur / சோழிங்கநல்லூர்', 'Perungudi', ARRAY['Booth 1 - School', 'Booth 2 - Community Hall']),

-- Coimbatore areas
('Coimbatore / கோயம்புத்தூர்', 'Coimbatore North / கோயம்புத்தூர் வடக்கு', 'Gandhipuram', ARRAY['Booth 1 - Town Hall', 'Booth 2 - School']),
('Coimbatore / கோயம்புத்தூர்', 'Coimbatore North / கோயம்புத்தூர் வடக்கு', 'RS Puram', ARRAY['Booth 1 - School', 'Booth 2 - Temple']),
('Coimbatore / கோயம்புத்தூர்', 'Coimbatore South / கோயம்புத்தூர் தெற்கு', 'Peelamedu', ARRAY['Booth 1 - College', 'Booth 2 - School']),
('Coimbatore / கோயம்புத்தூர்', 'Coimbatore South / கோயம்புத்தூர் தெற்கு', 'Saibaba Colony', ARRAY['Booth 1 - School', 'Booth 2 - Community Hall']),
('Coimbatore / கோயம்புத்தூர்', 'Singanallur / சிங்காநல்லூர்', 'Singanallur Main', ARRAY['Booth 1 - School', 'Booth 2 - Library']),
('Coimbatore / கோயம்புத்தூர்', 'Singanallur / சிங்காநல்லூர்', 'Hopes College', ARRAY['Booth 1 - College', 'Booth 2 - School']),

-- Madurai areas
('Madurai / மதுரை', 'Madurai Central / மதுரை மத்திய', 'Meenakshi Temple Area', ARRAY['Booth 1 - Temple', 'Booth 2 - School']),
('Madurai / மதுரை', 'Madurai Central / மதுரை மத்திய', 'Periyar Bus Stand', ARRAY['Booth 1 - Bus Stand', 'Booth 2 - School']),
('Madurai / மதுரை', 'Madurai North / மதுரை வடக்கு', 'Anna Nagar', ARRAY['Booth 1 - School', 'Booth 2 - Community Hall']),
('Madurai / மதுரை', 'Madurai North / மதுரை வடக்கு', 'KK Nagar', ARRAY['Booth 1 - School', 'Booth 2 - Temple']),

-- Tiruchirappalli areas
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Trichy West / திருச்சி மேற்கு', 'Srirangam', ARRAY['Booth 1 - Temple', 'Booth 2 - School']),
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Trichy West / திருச்சி மேற்கு', 'Thillai Nagar', ARRAY['Booth 1 - School', 'Booth 2 - College']),
('Tiruchirappalli / திருச்சிராப்பள்ளி', 'Trichy East / திருச்சி கிழக்கு', 'Cantonment', ARRAY['Booth 1 - School', 'Booth 2 - Library']),

-- Salem areas
('Salem / சேலம்', 'Salem North / சேலம் வடக்கு', 'Shevapet', ARRAY['Booth 1 - School', 'Booth 2 - Temple']),
('Salem / சேலம்', 'Salem North / சேலம் வடக்கு', 'Fairlands', ARRAY['Booth 1 - School', 'Booth 2 - Community Hall']),
('Salem / சேலம்', 'Salem South / சேலம் தெற்கு', 'Hasthampatti', ARRAY['Booth 1 - School', 'Booth 2 - College']),

-- Tirunelveli areas
('Tirunelveli / திருநெல்வேலி', 'Tirunelveli / திருநெல்வேலி', 'Palayamkottai', ARRAY['Booth 1 - College', 'Booth 2 - School']),
('Tirunelveli / திருநெல்வேலி', 'Tirunelveli / திருநெல்வேலி', 'Junction', ARRAY['Booth 1 - Bus Stand', 'Booth 2 - School']),

-- Erode areas
('Erode / ஈரோடு', 'Erode East / ஈரோடு கிழக்கு', 'Surampatti', ARRAY['Booth 1 - School', 'Booth 2 - Temple']),
('Erode / ஈரோடு', 'Erode West / ஈரோடு மேற்கு', 'Perundurai Road', ARRAY['Booth 1 - School', 'Booth 2 - College']),

-- Vellore areas
('Vellore / வேலூர்', 'Vellore / வேலூர்', 'Katpadi', ARRAY['Booth 1 - Railway Station', 'Booth 2 - School']),
('Vellore / வேலூர்', 'Vellore / வேலூர்', 'CMC Campus', ARRAY['Booth 1 - Hospital', 'Booth 2 - College'])
ON CONFLICT DO NOTHING;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grievances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteers;
