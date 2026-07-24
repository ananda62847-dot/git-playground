ALTER TABLE public.blueprint_tasks 
  ADD COLUMN IF NOT EXISTS evidence_required_ta text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS success_criteria_ta text[] DEFAULT '{}'::text[];