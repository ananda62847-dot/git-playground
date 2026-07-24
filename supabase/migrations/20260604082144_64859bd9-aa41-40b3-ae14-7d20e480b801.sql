
-- AI Operations Center: decision audit table
CREATE TABLE IF NOT EXISTS public.ai_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  score_breakdown jsonb DEFAULT '{}'::jsonb,
  alternatives jsonb DEFAULT '[]'::jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending_review',
  metadata jsonb DEFAULT '{}'::jsonb,
  applied_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_decisions TO authenticated;
GRANT ALL ON public.ai_decisions TO service_role;

ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read AI decisions"
  ON public.ai_decisions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.moderator_constituencies WHERE user_id = auth.uid()));

CREATE POLICY "Admins update AI decisions"
  ON public.ai_decisions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role inserts AI decisions"
  ON public.ai_decisions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ai_decisions_created ON public.ai_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_entity ON public.ai_decisions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_status ON public.ai_decisions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_agent ON public.ai_decisions (agent_type, created_at DESC);
