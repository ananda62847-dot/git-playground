
ALTER TABLE public.blueprint_tasks
  ADD COLUMN IF NOT EXISTS title_ta text,
  ADD COLUMN IF NOT EXISTS objective_ta text;

ALTER TABLE public.resolution_blueprints
  ADD COLUMN IF NOT EXISTS title_ta text,
  ADD COLUMN IF NOT EXISTS case_summary_ta text;
