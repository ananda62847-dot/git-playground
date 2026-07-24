GRANT EXECUTE ON FUNCTION public.submit_fund_request(
  text, text, text, text, integer, text, text, text, numeric, text, text, text[], boolean, uuid
) TO anon, authenticated, service_role;

GRANT INSERT ON public.fund_assistance_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_assistance_requests TO authenticated;
GRANT ALL ON public.fund_assistance_requests TO service_role;

DROP POLICY IF EXISTS "Anyone can submit fund requests" ON public.fund_assistance_requests;
CREATE POLICY "Anyone can submit fund requests"
ON public.fund_assistance_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (disclaimer_accepted = true);