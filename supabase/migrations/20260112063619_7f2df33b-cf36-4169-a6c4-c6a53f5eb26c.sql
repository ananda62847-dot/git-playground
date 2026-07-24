-- Tighten public INSERT RLS checks to avoid permissive WITH CHECK(true)

DO $$
BEGIN
  BEGIN EXECUTE 'DROP POLICY "Public can insert suggestions" ON public.suggestions'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Public can insert grievances" ON public.grievances'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Public can insert volunteers" ON public.volunteers'; EXCEPTION WHEN undefined_object THEN END;
END $$;

-- Suggestions: require minimal fields
CREATE POLICY "Public can insert suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(btrim(name)) >= 2 AND
  age IS NOT NULL AND age BETWEEN 18 AND 120 AND
  city IS NOT NULL AND length(btrim(city)) > 0 AND
  pincode IS NOT NULL AND length(pincode) = 6 AND
  occupation IS NOT NULL AND length(btrim(occupation)) > 0 AND
  suggestion IS NOT NULL AND length(btrim(suggestion)) >= 20
);

-- Grievances: require minimal fields
CREATE POLICY "Public can insert grievances"
ON public.grievances
FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(btrim(name)) >= 2 AND
  age IS NOT NULL AND age BETWEEN 18 AND 120 AND
  city IS NOT NULL AND length(btrim(city)) > 0 AND
  pincode IS NOT NULL AND length(pincode) = 6 AND
  occupation IS NOT NULL AND length(btrim(occupation)) > 0 AND
  grievance IS NOT NULL AND length(btrim(grievance)) >= 20
);

-- Volunteers: require minimal fields
CREATE POLICY "Public can insert volunteers"
ON public.volunteers
FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(btrim(name)) >= 2 AND
  phone IS NOT NULL AND length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15 AND
  city IS NOT NULL AND length(btrim(city)) > 0
);
