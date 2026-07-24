
ALTER TABLE public.blueprint_tasks
  ADD COLUMN IF NOT EXISTS contact_point text,
  ADD COLUMN IF NOT EXISTS contact_point_ta text;

ALTER TABLE public.resolution_blueprints
  ADD COLUMN IF NOT EXISTS area_type text;
