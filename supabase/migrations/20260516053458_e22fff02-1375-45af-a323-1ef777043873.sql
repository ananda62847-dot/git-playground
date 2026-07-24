-- Allow anonymous and logged-in users to create reports with all public form fields
GRANT INSERT (
  city,
  constituency,
  area,
  department,
  description,
  amount_demanded,
  incident_date,
  evidence_url,
  incident_type,
  office_location,
  person_involved,
  person_name,
  incident_time,
  confirmed_good_faith,
  evidence_urls
) ON public.corruption_reports TO anon, authenticated;

-- Keep report rows private while allowing a submitter to receive only the generated ticket number
CREATE OR REPLACE FUNCTION public.submit_corruption_report(
  _city text DEFAULT NULL,
  _constituency text DEFAULT NULL,
  _area text DEFAULT NULL,
  _department text DEFAULT NULL,
  _description text DEFAULT NULL,
  _amount_demanded numeric DEFAULT NULL,
  _incident_date date DEFAULT NULL,
  _evidence_url text DEFAULT NULL,
  _incident_type text DEFAULT NULL,
  _office_location text DEFAULT NULL,
  _person_involved text DEFAULT NULL,
  _person_name text DEFAULT NULL,
  _incident_time text DEFAULT NULL,
  _confirmed_good_faith boolean DEFAULT false,
  _evidence_urls text[] DEFAULT '{}'::text[]
)
RETURNS TABLE(ticket_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket text;
BEGIN
  IF _description IS NULL OR length(trim(_description)) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters';
  END IF;

  IF COALESCE(_confirmed_good_faith, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Good faith confirmation is required';
  END IF;

  INSERT INTO public.corruption_reports (
    city,
    constituency,
    area,
    department,
    description,
    amount_demanded,
    incident_date,
    evidence_url,
    incident_type,
    office_location,
    person_involved,
    person_name,
    incident_time,
    confirmed_good_faith,
    evidence_urls
  ) VALUES (
    NULLIF(trim(_city), ''),
    NULLIF(trim(_constituency), ''),
    NULLIF(trim(_area), ''),
    NULLIF(trim(_department), ''),
    trim(_description),
    _amount_demanded,
    _incident_date,
    NULLIF(trim(_evidence_url), ''),
    NULLIF(trim(_incident_type), ''),
    NULLIF(trim(_office_location), ''),
    NULLIF(trim(_person_involved), ''),
    NULLIF(trim(_person_name), ''),
    NULLIF(trim(_incident_time), ''),
    _confirmed_good_faith,
    COALESCE(_evidence_urls, '{}'::text[])
  )
  RETURNING corruption_reports.ticket_no INTO _ticket;

  RETURN QUERY SELECT _ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_corruption_report(text, text, text, text, text, numeric, date, text, text, text, text, text, text, boolean, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_corruption_report(text, text, text, text, text, numeric, date, text, text, text, text, text, text, boolean, text[]) TO anon, authenticated;

-- Re-affirm RLS rules: public users can only create valid reports; admins can read/update them.
DROP POLICY IF EXISTS "Anyone submit corruption report" ON public.corruption_reports;
CREATE POLICY "Anyone submit corruption report"
ON public.corruption_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  description IS NOT NULL
  AND length(trim(description)) >= 10
  AND confirmed_good_faith IS TRUE
);

DROP POLICY IF EXISTS "Admins read corruption reports" ON public.corruption_reports;
CREATE POLICY "Admins read corruption reports"
ON public.corruption_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update corruption reports" ON public.corruption_reports;
CREATE POLICY "Admins update corruption reports"
ON public.corruption_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));