
-- 1) cadres last_seen_at
ALTER TABLE public.cadres ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 2) false-closed columns on report tables
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS closed_as_false boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_as_false_reason text,
  ADD COLUMN IF NOT EXISTS closed_as_false_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_as_false_by uuid;

ALTER TABLE public.welfare_issues
  ADD COLUMN IF NOT EXISTS closed_as_false boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_as_false_reason text,
  ADD COLUMN IF NOT EXISTS closed_as_false_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_as_false_by uuid;

ALTER TABLE public.fund_assistance_requests
  ADD COLUMN IF NOT EXISTS closed_as_false boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_as_false_reason text,
  ADD COLUMN IF NOT EXISTS closed_as_false_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_as_false_by uuid,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS voice_note_url text;

ALTER TABLE public.corruption_reports
  ADD COLUMN IF NOT EXISTS closed_as_false boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_as_false_reason text,
  ADD COLUMN IF NOT EXISTS closed_as_false_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_as_false_by uuid;

-- 3) submit_problem: add filed_by_cadre_id, latitude, longitude, voice_note_url, belongs_to_constituency
CREATE OR REPLACE FUNCTION public.submit_problem(
  _reporter_name text,
  _reporter_phone text,
  _pincode text,
  _city text,
  _category text,
  _department text,
  _title text,
  _description text,
  _reporter_age integer DEFAULT NULL,
  _constituency text DEFAULT NULL,
  _area text DEFAULT NULL,
  _polling_booth text DEFAULT NULL,
  _address_line text DEFAULT NULL,
  _urgency text DEFAULT 'medium',
  _photo_urls text[] DEFAULT '{}'::text[],
  _filed_by_cadre_id uuid DEFAULT NULL,
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _voice_note_url text DEFAULT NULL,
  _belongs_to_constituency boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE new_id uuid; new_ticket text; u text;
BEGIN
  INSERT INTO problems(
    reporter_name, reporter_phone, reporter_age, pincode, city, constituency,
    area, polling_booth, address_line, category, department, urgency, title, description,
    status, is_cadre_filed, reported_by_cadre_id, latitude, longitude, voice_note_url, belongs_to_constituency
  ) VALUES (
    _reporter_name, _reporter_phone, _reporter_age, _pincode, _city, _constituency,
    _area, _polling_booth, _address_line, _category, _department, COALESCE(_urgency,'medium'),
    _title, _description, 'submitted',
    _filed_by_cadre_id IS NOT NULL, _filed_by_cadre_id, _latitude, _longitude, _voice_note_url, _belongs_to_constituency
  )
  RETURNING id, ticket_no INTO new_id, new_ticket;

  IF _photo_urls IS NOT NULL THEN
    FOREACH u IN ARRAY _photo_urls LOOP
      INSERT INTO problem_media(problem_id, url, media_type) VALUES (new_id, u, 'image');
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', new_id, 'ticket_no', new_ticket);
END;
$$;

-- 4) submit_welfare_issue: add filed_by_cadre_id, voice_note_url, belongs_to_constituency
CREATE OR REPLACE FUNCTION public.submit_welfare_issue(
  _reporter_name text,
  _reporter_phone text,
  _pincode text,
  _city text,
  _scheme_type text,
  _subcategory text,
  _title text,
  _description text,
  _application_id text DEFAULT NULL,
  _constituency text DEFAULT NULL,
  _area text DEFAULT NULL,
  _scheme_name text DEFAULT NULL,
  _months_pending text DEFAULT NULL,
  _proof_urls text[] DEFAULT '{}'::text[],
  _filed_by_cadre_id uuid DEFAULT NULL,
  _voice_note_url text DEFAULT NULL,
  _belongs_to_constituency boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE new_id uuid; new_ticket text;
BEGIN
  INSERT INTO welfare_issues(
    reporter_name, reporter_phone, application_id, pincode, city, constituency, area,
    scheme_type, scheme_name, subcategory, months_pending, title, description, proof_urls,
    status, is_cadre_filed, reported_by_cadre_id, voice_note_url, belongs_to_constituency
  ) VALUES (
    _reporter_name, _reporter_phone, _application_id, _pincode, _city, _constituency, _area,
    _scheme_type, _scheme_name, _subcategory, _months_pending, _title, _description, _proof_urls,
    'submitted', _filed_by_cadre_id IS NOT NULL, _filed_by_cadre_id, _voice_note_url, _belongs_to_constituency
  )
  RETURNING id, ticket_no INTO new_id, new_ticket;

  RETURN jsonb_build_object('id', new_id, 'ticket_no', new_ticket);
END;
$$;

-- 5) submit_corruption_report: add filed_by_cadre_id, belongs_to_constituency
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
  _evidence_urls text[] DEFAULT '{}'::text[],
  _filed_by_cadre_id uuid DEFAULT NULL,
  _belongs_to_constituency boolean DEFAULT NULL
)
RETURNS TABLE(ticket_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _ticket text;
BEGIN
  IF _description IS NULL OR length(trim(_description)) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters';
  END IF;
  IF COALESCE(_confirmed_good_faith, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Good faith confirmation is required';
  END IF;

  INSERT INTO public.corruption_reports (
    city, constituency, area, department, description, amount_demanded, incident_date,
    evidence_url, incident_type, office_location, person_involved, person_name, incident_time,
    confirmed_good_faith, evidence_urls, is_cadre_filed, reported_by_cadre_id, belongs_to_constituency
  ) VALUES (
    NULLIF(trim(_city), ''), NULLIF(trim(_constituency), ''), NULLIF(trim(_area), ''),
    NULLIF(trim(_department), ''), trim(_description), _amount_demanded, _incident_date,
    NULLIF(trim(_evidence_url), ''), NULLIF(trim(_incident_type), ''),
    NULLIF(trim(_office_location), ''), NULLIF(trim(_person_involved), ''),
    NULLIF(trim(_person_name), ''), NULLIF(trim(_incident_time), ''),
    _confirmed_good_faith, COALESCE(_evidence_urls, '{}'::text[]),
    _filed_by_cadre_id IS NOT NULL, _filed_by_cadre_id, _belongs_to_constituency
  ) RETURNING corruption_reports.ticket_no INTO _ticket;

  RETURN QUERY SELECT _ticket;
END;
$$;

-- 6) submit_fund_request: add lat/lng/voice_note_url/belongs_to_constituency
CREATE OR REPLACE FUNCTION public.submit_fund_request(
  _category text,
  _beneficiary_name text,
  _beneficiary_phone text,
  _purpose text,
  _beneficiary_age integer DEFAULT NULL,
  _beneficiary_address text DEFAULT NULL,
  _constituency text DEFAULT NULL,
  _city text DEFAULT NULL,
  _amount_requested numeric DEFAULT NULL,
  _urgency text DEFAULT 'medium',
  _bank_details text DEFAULT NULL,
  _supporting_docs text[] DEFAULT '{}'::text[],
  _disclaimer_accepted boolean DEFAULT false,
  _filed_by_cadre_id uuid DEFAULT NULL,
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _voice_note_url text DEFAULT NULL,
  _belongs_to_constituency boolean DEFAULT NULL
)
RETURNS TABLE(ticket_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _ticket text;
BEGIN
  IF NOT COALESCE(_disclaimer_accepted, false) THEN
    RAISE EXCEPTION 'Disclaimer must be accepted';
  END IF;
  IF _beneficiary_name IS NULL OR length(trim(_beneficiary_name)) = 0 THEN
    RAISE EXCEPTION 'Beneficiary name is required';
  END IF;
  IF _beneficiary_phone IS NULL OR length(trim(_beneficiary_phone)) < 10 THEN
    RAISE EXCEPTION 'Valid phone is required';
  END IF;
  IF _purpose IS NULL OR length(trim(_purpose)) = 0 THEN
    RAISE EXCEPTION 'Purpose is required';
  END IF;

  INSERT INTO public.fund_assistance_requests (
    category, beneficiary_name, beneficiary_age, beneficiary_phone,
    beneficiary_address, constituency, city, amount_requested, purpose,
    urgency, bank_details, supporting_docs, disclaimer_accepted,
    filed_by_cadre_id, is_cadre_filed, latitude, longitude, voice_note_url, belongs_to_constituency
  ) VALUES (
    _category, trim(_beneficiary_name), _beneficiary_age, trim(_beneficiary_phone),
    NULLIF(trim(_beneficiary_address), ''), NULLIF(trim(_constituency), ''),
    NULLIF(trim(_city), ''), _amount_requested, trim(_purpose),
    COALESCE(_urgency, 'medium'), NULLIF(trim(_bank_details), ''),
    COALESCE(_supporting_docs, '{}'::text[]), true,
    _filed_by_cadre_id, _filed_by_cadre_id IS NOT NULL,
    _latitude, _longitude, _voice_note_url, _belongs_to_constituency
  ) RETURNING fund_assistance_requests.ticket_no INTO _ticket;

  RETURN QUERY SELECT _ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_problem(text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text[],uuid,numeric,numeric,text,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_welfare_issue(text,text,text,text,text,text,text,text,text,text,text,text,text,text[],uuid,text,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_corruption_report(text,text,text,text,text,numeric,date,text,text,text,text,text,text,boolean,text[],uuid,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_fund_request(text,text,text,text,integer,text,text,text,numeric,text,text,text[],boolean,uuid,numeric,numeric,text,boolean) TO anon, authenticated;
