ALTER TABLE public.problem_assignments
ADD COLUMN IF NOT EXISTS estimated_completion_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_problem_assignments_problem_eta
ON public.problem_assignments (problem_id, estimated_completion_at)
WHERE estimated_completion_at IS NOT NULL;