-- 1. Claim column
ALTER TABLE public.problem_assignments
  ADD COLUMN IF NOT EXISTS claimed_by_cadre_id uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- 2. Joiners table
CREATE TABLE IF NOT EXISTS public.problem_assignment_joiners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  cadre_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, cadre_id)
);
ALTER TABLE public.problem_assignment_joiners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view joiners" ON public.problem_assignment_joiners FOR SELECT USING (true);
CREATE POLICY "Cadre joins as self" ON public.problem_assignment_joiners FOR INSERT TO authenticated
  WITH CHECK (cadre_id = public.current_cadre_id());
CREATE POLICY "Cadre leaves own join" ON public.problem_assignment_joiners FOR DELETE TO authenticated
  USING (cadre_id = public.current_cadre_id());

-- 3. Allow team members to UPDATE their assignment to claim it
CREATE POLICY "Team member claims assignment"
  ON public.problem_assignments
  FOR UPDATE
  TO authenticated
  USING (
    claimed_by_cadre_id IS NULL
    AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = problem_assignments.team_id
        AND tm.cadre_id = public.current_cadre_id()
    )
  )
  WITH CHECK (
    claimed_by_cadre_id = public.current_cadre_id()
  );

-- 4. Tighten cadre updates: only the claimer (or directly-assigned cadre) may add updates / change status
DROP POLICY IF EXISTS "Cadres add updates" ON public.problem_updates;
CREATE POLICY "Cadres add updates" ON public.problem_updates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.problem_assignments pa
      WHERE pa.problem_id = problem_updates.problem_id
        AND pa.active = true
        AND (
          pa.cadre_id = public.current_cadre_id()
          OR pa.claimed_by_cadre_id = public.current_cadre_id()
        )
    )
  );

DROP POLICY IF EXISTS "Cadres update assigned problems" ON public.problems;
CREATE POLICY "Cadres update assigned problems" ON public.problems FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_assignments pa
      WHERE pa.problem_id = problems.id
        AND pa.active = true
        AND (
          pa.cadre_id = public.current_cadre_id()
          OR pa.claimed_by_cadre_id = public.current_cadre_id()
        )
    )
  )
  WITH CHECK (true);

-- 5. Public cadre directory (safe fields only)
CREATE OR REPLACE FUNCTION public.get_public_cadres(_constituency text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  level text,
  role_title text,
  area text,
  constituency text,
  city text,
  ward_number text,
  profile_photo_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, level, role_title, area, constituency, city, ward_number, profile_photo_url
  FROM public.cadres
  WHERE active = true AND approved = true
    AND (_constituency IS NULL OR constituency = _constituency)
  ORDER BY level, name;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_cadres(text) TO anon, authenticated;