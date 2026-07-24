
-- Allow cadres to see team rows for any team they belong to
CREATE POLICY "Cadres view own team"
ON public.teams
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.team_id = teams.id AND tm.cadre_id = public.current_cadre_id()
));

-- Allow cadres to see all team_members rows for their own teams
CREATE POLICY "Cadres view team_members of own teams"
ON public.team_members
FOR SELECT
USING (
  cadre_id = public.current_cadre_id()
  OR EXISTS (
    SELECT 1 FROM public.team_members me
    WHERE me.team_id = team_members.team_id AND me.cadre_id = public.current_cadre_id()
  )
);

-- Allow cadres to view basic info of fellow team members
CREATE POLICY "Cadres view teammates"
ON public.cadres
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.team_members me
  JOIN public.team_members other ON other.team_id = me.team_id
  WHERE me.cadre_id = public.current_cadre_id()
    AND other.cadre_id = cadres.id
));

-- City-level aggregation for heatmap
CREATE OR REPLACE FUNCTION public.get_city_problem_counts()
RETURNS TABLE(city text, total bigint, resolved bigint, pending bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    coalesce(city, 'Unknown') as city,
    count(*) as total,
    count(*) filter (where status IN ('resolved','completed','citizen_confirmed')) as resolved,
    count(*) filter (where status NOT IN ('resolved','completed','citizen_confirmed')) as pending
  FROM public.problems
  GROUP BY coalesce(city, 'Unknown');
$$;

CREATE OR REPLACE FUNCTION public.get_city_breakdown(_city text)
RETURNS TABLE(category text, total bigint, resolved bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT category,
         count(*) as total,
         count(*) filter (where status IN ('resolved','completed','citizen_confirmed')) as resolved
  FROM public.problems
  WHERE city = _city
  GROUP BY category
  ORDER BY total DESC;
$$;

-- Storage policies for cadre photos in problem-media bucket
DO $$ BEGIN
  CREATE POLICY "Anyone can upload cadre photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'problem-media' AND (storage.foldername(name))[1] = 'cadre-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can read problem-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'problem-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
