
CREATE TABLE public.evidence_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL UNIQUE,
  entity_type text NOT NULL,
  entity_id uuid,
  overall_score numeric(4,2),
  relevance numeric(4,2),
  clarity numeric(4,2),
  authenticity numeric(4,2),
  context text,
  remarks text,
  model text,
  uploaded_by_cadre_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evidence_scores_entity_idx ON public.evidence_scores(entity_type, entity_id);

GRANT SELECT ON public.evidence_scores TO authenticated;
GRANT ALL ON public.evidence_scores TO service_role;

ALTER TABLE public.evidence_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all evidence scores"
  ON public.evidence_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cadre reads own evidence scores"
  ON public.evidence_scores FOR SELECT TO authenticated
  USING (uploaded_by_cadre_id = public.current_cadre_id());

CREATE POLICY "Cadre inserts own evidence scores"
  ON public.evidence_scores FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_cadre_id = public.current_cadre_id() OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence_scores;
