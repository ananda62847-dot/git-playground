
ALTER TABLE public.resolution_blueprints
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'field';

CREATE INDEX IF NOT EXISTS idx_blueprints_problem_track
  ON public.resolution_blueprints(problem_id, track) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_blueprints_welfare_track
  ON public.resolution_blueprints(welfare_id, track) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_blueprints_corruption_track
  ON public.resolution_blueprints(corruption_id, track) WHERE is_active;
