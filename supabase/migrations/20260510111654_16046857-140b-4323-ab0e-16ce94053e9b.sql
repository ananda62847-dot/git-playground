
-- 1. Add 'cadre' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cadre';

-- 2. Link cadres to auth users
ALTER TABLE public.cadres
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ward_number text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'admin';
CREATE UNIQUE INDEX IF NOT EXISTS cadres_user_id_uidx ON public.cadres(user_id) WHERE user_id IS NOT NULL;

-- Cadre can view & update own profile
DROP POLICY IF EXISTS "Cadres view own profile" ON public.cadres;
CREATE POLICY "Cadres view own profile" ON public.cadres
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Cadres update own profile" ON public.cadres;
CREATE POLICY "Cadres update own profile" ON public.cadres
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Cadres can view problems assigned to them
DROP POLICY IF EXISTS "Cadres view assigned problems" ON public.problems;
CREATE POLICY "Cadres view assigned problems" ON public.problems
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.problem_assignments pa
      JOIN public.cadres c ON c.id = pa.cadre_id OR c.id IN (
        SELECT tm.cadre_id FROM public.team_members tm WHERE tm.team_id = pa.team_id
      )
      WHERE pa.problem_id = problems.id AND c.user_id = auth.uid() AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "Cadres update assigned problems" ON public.problems;
CREATE POLICY "Cadres update assigned problems" ON public.problems
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.problem_assignments pa
      JOIN public.cadres c ON c.id = pa.cadre_id OR c.id IN (
        SELECT tm.cadre_id FROM public.team_members tm WHERE tm.team_id = pa.team_id
      )
      WHERE pa.problem_id = problems.id AND c.user_id = auth.uid() AND pa.active = true
    )
  ) WITH CHECK (true);

-- Cadres add updates
DROP POLICY IF EXISTS "Cadres add updates" ON public.problem_updates;
CREATE POLICY "Cadres add updates" ON public.problem_updates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.problem_assignments pa
      JOIN public.cadres c ON c.id = pa.cadre_id OR c.id IN (
        SELECT tm.cadre_id FROM public.team_members tm WHERE tm.team_id = pa.team_id
      )
      WHERE pa.problem_id = problem_updates.problem_id AND c.user_id = auth.uid() AND pa.active = true
    )
  );

-- 4. Before/After proof on updates
ALTER TABLE public.problem_updates
  ADD COLUMN IF NOT EXISTS before_url text,
  ADD COLUMN IF NOT EXISTS after_url text;

-- 5. Escalations
CREATE TABLE IF NOT EXISTS public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL,
  raised_by uuid,
  raised_by_cadre_id uuid,
  to_level text NOT NULL DEFAULT 'department_officer',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view escalations" ON public.escalations FOR SELECT USING (true);
CREATE POLICY "Authenticated raise escalations" ON public.escalations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins update escalations" ON public.escalations
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Team postings (appointments / duty rosters)
CREATE TABLE IF NOT EXISTS public.team_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  cadre_id uuid NOT NULL,
  posting_title text NOT NULL,
  posting_type text NOT NULL DEFAULT 'duty',
  area text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view postings" ON public.team_postings FOR SELECT USING (true);
CREATE POLICY "Admins manage postings" ON public.team_postings
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators manage postings in scope" ON public.team_postings
  FOR ALL TO authenticated USING (
    has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
      SELECT 1 FROM public.teams t JOIN public.moderator_constituencies mc
        ON mc.constituency = t.constituency
      WHERE t.id = team_postings.team_id AND mc.user_id = auth.uid()
    )
  ) WITH CHECK (
    has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
      SELECT 1 FROM public.teams t JOIN public.moderator_constituencies mc
        ON mc.constituency = t.constituency
      WHERE t.id = team_postings.team_id AND mc.user_id = auth.uid()
    )
  );

-- 7. SLA targets
CREATE TABLE IF NOT EXISTS public.sla_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  category text,
  urgency text NOT NULL DEFAULT 'medium',
  hours_to_acknowledge integer NOT NULL DEFAULT 24,
  hours_to_resolve integer NOT NULL DEFAULT 168,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view SLA" ON public.sla_targets FOR SELECT USING (true);
CREATE POLICY "Admins manage SLA" ON public.sla_targets
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 8. Re-affirm corruption submission for anon and authenticated explicitly
DROP POLICY IF EXISTS "Anyone submit corruption report" ON public.corruption_reports;
CREATE POLICY "Anyone submit corruption report" ON public.corruption_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(description)) >= 20);

-- 9. Helper: lookup cadre by auth user
CREATE OR REPLACE FUNCTION public.current_cadre_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.cadres WHERE user_id = auth.uid() LIMIT 1;
$$;
