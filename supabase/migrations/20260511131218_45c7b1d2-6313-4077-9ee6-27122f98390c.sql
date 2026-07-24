
-- 1. Fix corruption_reports insert policy
DROP POLICY IF EXISTS "Anyone submit corruption report" ON public.corruption_reports;
CREATE POLICY "Anyone submit corruption report"
  ON public.corruption_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(trim(description)) >= 10);

-- 2. Public stats RPC (security definer to bypass RLS for aggregate counts only)
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE (
  suggestions_count bigint,
  grievances_count bigint,
  volunteers_count bigint,
  problems_count bigint,
  resolved_count bigint,
  cadres_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.suggestions),
    (SELECT count(*) FROM public.grievances),
    (SELECT count(*) FROM public.volunteers),
    (SELECT count(*) FROM public.problems),
    (SELECT count(*) FROM public.problems WHERE status = 'resolved'),
    (SELECT count(*) FROM public.cadres WHERE active = true);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

-- 3. Constituency-wise problem counts for the public choropleth map
CREATE OR REPLACE FUNCTION public.get_constituency_problem_counts()
RETURNS TABLE (constituency text, total bigint, resolved bigint, pending bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(constituency, 'Unknown') as constituency,
    count(*) as total,
    count(*) filter (where status = 'resolved') as resolved,
    count(*) filter (where status <> 'resolved') as pending
  FROM public.problems
  GROUP BY coalesce(constituency, 'Unknown');
$$;

GRANT EXECUTE ON FUNCTION public.get_constituency_problem_counts() TO anon, authenticated;
