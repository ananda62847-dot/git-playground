
-- Make evidence_scores append-only history
ALTER TABLE public.evidence_scores DROP CONSTRAINT IF EXISTS evidence_scores_file_url_key;
ALTER TABLE public.evidence_scores ADD COLUMN IF NOT EXISTS run_reason text NOT NULL DEFAULT 'initial';
ALTER TABLE public.evidence_scores ADD COLUMN IF NOT EXISTS triggered_by_user_id uuid;
CREATE INDEX IF NOT EXISTS evidence_scores_file_created_idx ON public.evidence_scores(file_url, created_at DESC);
