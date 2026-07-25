ALTER TABLE public.resolution_blueprints DROP CONSTRAINT IF EXISTS resolution_blueprints_problem_id_version_key;
ALTER TABLE public.resolution_blueprints DROP CONSTRAINT IF EXISTS resolution_blueprints_welfare_id_version_key;
ALTER TABLE public.resolution_blueprints DROP CONSTRAINT IF EXISTS resolution_blueprints_corruption_id_version_key;

CREATE UNIQUE INDEX IF NOT EXISTS resolution_blueprints_problem_track_version_key
  ON public.resolution_blueprints (problem_id, track, version) WHERE problem_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS resolution_blueprints_welfare_track_version_key
  ON public.resolution_blueprints (welfare_id, track, version) WHERE welfare_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS resolution_blueprints_corruption_track_version_key
  ON public.resolution_blueprints (corruption_id, track, version) WHERE corruption_id IS NOT NULL;