-- Agentic AI Phase 3 + 4: Cadre two-way loop, orchestrator runs, learning weights

CREATE TABLE IF NOT EXISTS public.cadre_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadre_id uuid NOT NULL REFERENCES public.cadres(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.ai_decisions(id) ON DELETE SET NULL,
  problem_id uuid REFERENCES public.problems(id) ON DELETE CASCADE,
  action text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'new',
  due_at timestamptz,
  ai_message text NOT NULL,
  cadre_response text,
  delivered_channels jsonb DEFAULT '[]'::jsonb,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cadre_ai_tasks TO authenticated;
GRANT ALL ON public.cadre_ai_tasks TO service_role;
ALTER TABLE public.cadre_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cadres read own ai tasks" ON public.cadre_ai_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cadres WHERE cadres.id = cadre_ai_tasks.cadre_id AND cadres.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.moderator_constituencies mc
               JOIN public.cadres c ON c.id = cadre_ai_tasks.cadre_id
               WHERE mc.user_id = auth.uid() AND mc.constituency = c.constituency)
  );

CREATE POLICY "Cadres respond to own ai tasks" ON public.cadre_ai_tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cadres WHERE cadres.id = cadre_ai_tasks.cadre_id AND cadres.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai tasks" ON public.cadre_ai_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_cadre_ai_tasks_cadre ON public.cadre_ai_tasks(cadre_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cadre_ai_tasks_status ON public.cadre_ai_tasks(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'manual',
  agents_run jsonb DEFAULT '[]'::jsonb,
  outcomes jsonb DEFAULT '{}'::jsonb,
  decisions_created integer DEFAULT 0,
  tasks_dispatched integer DEFAULT 0,
  duration_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai runs" ON public.ai_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.moderator_constituencies WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON public.ai_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  cadre_id uuid REFERENCES public.cadres(id) ON DELETE CASCADE,
  category text,
  weight numeric NOT NULL DEFAULT 1.0,
  samples integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_type, cadre_id, category)
);

GRANT SELECT ON public.agent_weights TO authenticated;
GRANT ALL ON public.agent_weights TO service_role;
ALTER TABLE public.agent_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read weights" ON public.agent_weights FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.ai_decisions
  ADD COLUMN IF NOT EXISTS delivered_channels jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS cadre_response text;

CREATE OR REPLACE FUNCTION public.touch_cadre_ai_tasks_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_cadre_ai_tasks_touch ON public.cadre_ai_tasks;
CREATE TRIGGER trg_cadre_ai_tasks_touch
  BEFORE UPDATE ON public.cadre_ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_cadre_ai_tasks_updated_at();
