CREATE OR REPLACE FUNCTION public.is_current_cadre_in_team(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = _team_id
      AND tm.cadre_id = public.current_cadre_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_cadre_teammate(_cadre_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members me
    JOIN public.team_members other ON other.team_id = me.team_id
    WHERE me.cadre_id = public.current_cadre_id()
      AND other.cadre_id = _cadre_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_current_cadre_access_assignment(_problem_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.problem_assignments pa
    WHERE pa.problem_id = _problem_id
      AND pa.active = true
      AND (
        pa.cadre_id = public.current_cadre_id()
        OR pa.claimed_by_cadre_id = public.current_cadre_id()
        OR (pa.team_id IS NOT NULL AND public.is_current_cadre_in_team(pa.team_id))
      )
  );
$$;

DROP POLICY IF EXISTS "Cadres view teammates" ON public.cadres;
CREATE POLICY "Cadres view teammates"
ON public.cadres
FOR SELECT
USING (public.is_current_cadre_teammate(id));

DROP POLICY IF EXISTS "Cadres view team_members of own teams" ON public.team_members;
CREATE POLICY "Cadres view team_members of own teams"
ON public.team_members
FOR SELECT
USING ((cadre_id = public.current_cadre_id()) OR public.is_current_cadre_in_team(team_id));

DROP POLICY IF EXISTS "Cadres view own team" ON public.teams;
CREATE POLICY "Cadres view own team"
ON public.teams
FOR SELECT
USING (public.is_current_cadre_in_team(id));

DROP POLICY IF EXISTS "Team member claims assignment" ON public.problem_assignments;
CREATE POLICY "Team member claims assignment"
ON public.problem_assignments
FOR UPDATE
TO authenticated
USING ((claimed_by_cadre_id IS NULL) AND (team_id IS NOT NULL) AND public.is_current_cadre_in_team(team_id))
WITH CHECK (claimed_by_cadre_id = public.current_cadre_id());

DROP POLICY IF EXISTS "Cadres view assigned problems" ON public.problems;
CREATE POLICY "Cadres view assigned problems"
ON public.problems
FOR SELECT
TO authenticated
USING (public.can_current_cadre_access_assignment(id));

DROP POLICY IF EXISTS "Cadres update assigned problems" ON public.problems;
CREATE POLICY "Cadres update assigned problems"
ON public.problems
FOR UPDATE
TO authenticated
USING (public.can_current_cadre_access_assignment(id))
WITH CHECK (true);

DROP POLICY IF EXISTS "Cadres add updates" ON public.problem_updates;
CREATE POLICY "Cadres add updates"
ON public.problem_updates
FOR INSERT
TO authenticated
WITH CHECK (public.can_current_cadre_access_assignment(problem_id));