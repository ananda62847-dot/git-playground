-- 1. Create RPC to submit fund requests (fixes RLS returning issue for anon/non-cadre users)
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
  _filed_by_cadre_id uuid DEFAULT NULL
) RETURNS TABLE(ticket_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    filed_by_cadre_id, is_cadre_filed
  ) VALUES (
    _category, trim(_beneficiary_name), _beneficiary_age, trim(_beneficiary_phone),
    NULLIF(trim(_beneficiary_address), ''), NULLIF(trim(_constituency), ''),
    NULLIF(trim(_city), ''), _amount_requested, trim(_purpose),
    COALESCE(_urgency, 'medium'), NULLIF(trim(_bank_details), ''),
    COALESCE(_supporting_docs, '{}'::text[]), true,
    _filed_by_cadre_id, _filed_by_cadre_id IS NOT NULL
  ) RETURNING fund_assistance_requests.ticket_no INTO _ticket;

  RETURN QUERY SELECT _ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_fund_request(text,text,text,text,integer,text,text,text,numeric,text,text,text[],boolean,uuid) TO anon, authenticated;

-- 2. Drop citizen suggestions system (per user request to remove suggestions entirely)
DROP TABLE IF EXISTS public.citizen_suggestion_status_logs CASCADE;
DROP TABLE IF EXISTS public.citizen_suggestion_comments CASCADE;
DROP TABLE IF EXISTS public.citizen_suggestion_votes CASCADE;
DROP TABLE IF EXISTS public.citizen_suggestions CASCADE;
DROP TABLE IF EXISTS public.suggestions CASCADE;

-- Rebuild v_public_stats without suggestions_count (view depended on citizen_suggestions)
CREATE OR REPLACE VIEW public.v_public_stats AS
SELECT
  (SELECT count(*) FROM public.problems)                           AS problems_count,
  (SELECT count(*) FROM public.welfare_issues)                     AS welfare_count,
  0::bigint                                                        AS suggestions_count,
  (SELECT count(*) FROM public.corruption_reports)                 AS corruption_count,
  (SELECT count(*) FROM public.problems WHERE status IN ('resolved','completed','citizen_confirmed')) AS resolved_count,
  (SELECT count(*) FROM public.cadres WHERE active AND approved)   AS cadres_count,
  (SELECT count(*) FROM public.problems WHERE created_at > now() - interval '4 hours') AS reports_last_4h,
  (SELECT count(*) FROM public.problems WHERE resolved_at > now() - interval '24 hours') AS resolved_last_24h,
  0::bigint                                                        AS suggestions_last_4h;

GRANT SELECT ON public.v_public_stats TO anon, authenticated;