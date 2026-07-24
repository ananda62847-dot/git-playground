-- ============ WELFARE ASSIGNMENTS ============
CREATE TABLE public.welfare_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  welfare_id uuid NOT NULL,
  team_id uuid,
  cadre_id uuid,
  assigned_by uuid,
  claimed_by_cadre_id uuid,
  claimed_at timestamptz,
  estimated_completion_at timestamptz,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_welfare_assignments_welfare ON public.welfare_assignments(welfare_id) WHERE active = true;
CREATE INDEX idx_welfare_assignments_cadre ON public.welfare_assignments(cadre_id) WHERE active = true;
CREATE INDEX idx_welfare_assignments_team ON public.welfare_assignments(team_id) WHERE active = true;

GRANT SELECT ON public.welfare_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_assignments TO authenticated;
GRANT ALL ON public.welfare_assignments TO service_role;

ALTER TABLE public.welfare_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view welfare_assignments"
  ON public.welfare_assignments FOR SELECT USING (true);

CREATE POLICY "Admins manage welfare_assignments"
  ON public.welfare_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators assign welfare in their constituency"
  ON public.welfare_assignments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.welfare_issues w
      JOIN public.moderator_constituencies mc ON mc.constituency = w.constituency
      WHERE w.id = welfare_assignments.welfare_id AND mc.user_id = auth.uid()
    )
  );

CREATE POLICY "Moderators update welfare assignments in their constituency"
  ON public.welfare_assignments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.welfare_issues w
      JOIN public.moderator_constituencies mc ON mc.constituency = w.constituency
      WHERE w.id = welfare_assignments.welfare_id AND mc.user_id = auth.uid()
    )
  );

CREATE POLICY "Team member claims welfare assignment"
  ON public.welfare_assignments FOR UPDATE TO authenticated
  USING (
    claimed_by_cadre_id IS NULL
    AND team_id IS NOT NULL
    AND public.is_current_cadre_in_team(team_id)
  )
  WITH CHECK (claimed_by_cadre_id = public.current_cadre_id());

-- ============ CORRUPTION ASSIGNMENTS ============
CREATE TABLE public.corruption_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corruption_id uuid NOT NULL,
  team_id uuid,
  cadre_id uuid,
  assigned_by uuid,
  claimed_by_cadre_id uuid,
  claimed_at timestamptz,
  estimated_completion_at timestamptz,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_corruption_assignments_corr ON public.corruption_assignments(corruption_id) WHERE active = true;
CREATE INDEX idx_corruption_assignments_cadre ON public.corruption_assignments(cadre_id) WHERE active = true;

GRANT SELECT ON public.corruption_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corruption_assignments TO authenticated;
GRANT ALL ON public.corruption_assignments TO service_role;

ALTER TABLE public.corruption_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view corruption_assignments"
  ON public.corruption_assignments FOR SELECT USING (true);

CREATE POLICY "Admins manage corruption_assignments"
  ON public.corruption_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators assign corruption in their constituency"
  ON public.corruption_assignments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.corruption_reports cr
      JOIN public.moderator_constituencies mc ON mc.constituency = cr.constituency
      WHERE cr.id = corruption_assignments.corruption_id AND mc.user_id = auth.uid()
    )
  );

CREATE POLICY "Moderators update corruption assignments in their constituency"
  ON public.corruption_assignments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.corruption_reports cr
      JOIN public.moderator_constituencies mc ON mc.constituency = cr.constituency
      WHERE cr.id = corruption_assignments.corruption_id AND mc.user_id = auth.uid()
    )
  );

CREATE POLICY "Team member claims corruption assignment"
  ON public.corruption_assignments FOR UPDATE TO authenticated
  USING (
    claimed_by_cadre_id IS NULL
    AND team_id IS NOT NULL
    AND public.is_current_cadre_in_team(team_id)
  )
  WITH CHECK (claimed_by_cadre_id = public.current_cadre_id());

-- ============ CADRE ACCESS TO WELFARE / CORRUPTION ============
CREATE OR REPLACE FUNCTION public.can_current_cadre_access_welfare(_welfare_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.welfare_assignments wa
    WHERE wa.welfare_id = _welfare_id AND wa.active = true
      AND (
        wa.cadre_id = public.current_cadre_id()
        OR wa.claimed_by_cadre_id = public.current_cadre_id()
        OR (wa.team_id IS NOT NULL AND public.is_current_cadre_in_team(wa.team_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_current_cadre_access_corruption(_corruption_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.corruption_assignments ca
    WHERE ca.corruption_id = _corruption_id AND ca.active = true
      AND (
        ca.cadre_id = public.current_cadre_id()
        OR ca.claimed_by_cadre_id = public.current_cadre_id()
        OR (ca.team_id IS NOT NULL AND public.is_current_cadre_in_team(ca.team_id))
      )
  );
$$;

CREATE POLICY "Cadres view assigned welfare"
  ON public.welfare_issues FOR SELECT TO authenticated
  USING (public.can_current_cadre_access_welfare(id));

CREATE POLICY "Cadres update assigned welfare"
  ON public.welfare_issues FOR UPDATE TO authenticated
  USING (public.can_current_cadre_access_welfare(id))
  WITH CHECK (true);

CREATE POLICY "Cadres view assigned corruption"
  ON public.corruption_reports FOR SELECT TO authenticated
  USING (public.can_current_cadre_access_corruption(id));

CREATE POLICY "Cadres update assigned corruption"
  ON public.corruption_reports FOR UPDATE TO authenticated
  USING (public.can_current_cadre_access_corruption(id))
  WITH CHECK (true);

-- ============ AI ACTION PLAN CACHE ============
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS ai_action_plan text,
  ADD COLUMN IF NOT EXISTS ai_action_plan_at timestamptz;

ALTER TABLE public.welfare_issues
  ADD COLUMN IF NOT EXISTS ai_action_plan text,
  ADD COLUMN IF NOT EXISTS ai_action_plan_at timestamptz;

ALTER TABLE public.corruption_reports
  ADD COLUMN IF NOT EXISTS ai_action_plan text,
  ADD COLUMN IF NOT EXISTS ai_action_plan_at timestamptz;