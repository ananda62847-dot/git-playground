-- Relax public insert policies - UI already validates, RLS should just ensure basic presence

-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Public can insert suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Public can insert grievances" ON public.grievances;
DROP POLICY IF EXISTS "Public can insert volunteers" ON public.volunteers;

-- Create permissive INSERT policies with basic presence checks only
CREATE POLICY "Public can insert suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) >= 1 AND
  age IS NOT NULL AND age >= 1 AND age <= 150 AND
  city IS NOT NULL AND
  pincode IS NOT NULL AND length(pincode) = 6 AND
  occupation IS NOT NULL AND
  suggestion IS NOT NULL AND length(trim(suggestion)) >= 10
);

CREATE POLICY "Public can insert grievances"
ON public.grievances
FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) >= 1 AND
  age IS NOT NULL AND age >= 1 AND age <= 150 AND
  city IS NOT NULL AND
  pincode IS NOT NULL AND length(pincode) = 6 AND
  occupation IS NOT NULL AND
  grievance IS NOT NULL AND length(trim(grievance)) >= 10
);

CREATE POLICY "Public can insert volunteers"
ON public.volunteers
FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) >= 1 AND
  city IS NOT NULL AND
  phone IS NOT NULL AND length(phone) >= 10
);
