
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.can_edit_assignment(_problem_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.problem_assignments pa
    JOIN public.problems p ON p.id = pa.problem_id
    WHERE pa.problem_id = _problem_id AND pa.active = true
      AND pa.escalated_at IS NULL
      AND p.status NOT IN ('resolved','completed','citizen_confirmed','rejected','duplicate')
      AND ( pa.cadre_id = public.current_cadre_id()
         OR pa.claimed_by_cadre_id = public.current_cadre_id()
         OR (pa.team_id IS NOT NULL AND public.is_current_cadre_in_team(pa.team_id)) )
  );
$$;

ALTER TABLE public.problems        ADD COLUMN IF NOT EXISTS completion_report_url text;
ALTER TABLE public.completed_works ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS completed_works_slug_uidx ON public.completed_works(slug) WHERE slug IS NOT NULL;

ALTER TABLE public.escalations ADD COLUMN IF NOT EXISTS seen_by jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.escalations ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS problems_status_created_idx       ON public.problems(status, created_at DESC);
CREATE INDEX IF NOT EXISTS problems_const_status_idx         ON public.problems(constituency, status);
CREATE INDEX IF NOT EXISTS problems_dept_status_idx          ON public.problems(department, status);
CREATE INDEX IF NOT EXISTS problem_assignments_active_cadre_idx   ON public.problem_assignments(active, cadre_id);
CREATE INDEX IF NOT EXISTS problem_assignments_active_claimed_idx ON public.problem_assignments(active, claimed_by_cadre_id);
CREATE INDEX IF NOT EXISTS gamification_events_cadre_created_idx  ON public.gamification_events(cadre_id, created_at DESC);
CREATE INDEX IF NOT EXISTS escalations_status_created_idx    ON public.escalations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS cadre_ai_tasks_status_cadre_idx   ON public.cadre_ai_tasks(status, cadre_id);
CREATE INDEX IF NOT EXISTS problems_created_at_idx           ON public.problems(created_at DESC);

DROP MATERIALIZED VIEW IF EXISTS public.mv_cadre_workload;
CREATE MATERIALIZED VIEW public.mv_cadre_workload AS
SELECT
  c.id AS cadre_id,
  c.constituency,
  COUNT(pa.*) FILTER (WHERE pa.active = true) AS pending_assignments,
  COUNT(cat.*) FILTER (WHERE cat.status IN ('pending','assigned')) AS open_ai_tasks,
  MAX(pa.created_at) AS last_assigned_at
FROM public.cadres c
LEFT JOIN public.problem_assignments pa
  ON (pa.cadre_id = c.id OR pa.claimed_by_cadre_id = c.id) AND pa.active = true
LEFT JOIN public.cadre_ai_tasks cat
  ON cat.cadre_id = c.id AND cat.status IN ('pending','assigned')
WHERE c.active = true AND c.approved = true
GROUP BY c.id, c.constituency;

CREATE UNIQUE INDEX mv_cadre_workload_cadre_idx ON public.mv_cadre_workload(cadre_id);

CREATE OR REPLACE FUNCTION public.refresh_cadre_workload()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cadre_workload;
  EXCEPTION WHEN OTHERS THEN REFRESH MATERIALIZED VIEW public.mv_cadre_workload;
  END;
END $$;

GRANT SELECT ON public.mv_cadre_workload TO authenticated, service_role;
