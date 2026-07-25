
-- Recall / revert assignment support
ALTER TABLE public.problem_assignments
  ADD COLUMN IF NOT EXISTS recalled_at timestamptz,
  ADD COLUMN IF NOT EXISTS recalled_reason text,
  ADD COLUMN IF NOT EXISTS recalled_by uuid,
  ADD COLUMN IF NOT EXISTS recalled_from_cadre_id uuid,
  ADD COLUMN IF NOT EXISTS recalled_from_team_id uuid;

CREATE INDEX IF NOT EXISTS idx_problem_assignments_recalled
  ON public.problem_assignments (recalled_at)
  WHERE recalled_at IS NOT NULL;

-- Super-admin: recall (revert) all active assignments on a problem
CREATE OR REPLACE FUNCTION public.admin_recall_assignment(_problem_id uuid, _reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only super admins can recall assignments';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'A recall reason is required';
  END IF;

  UPDATE public.problem_assignments
    SET active = false,
        recalled_at = now(),
        recalled_reason = _reason,
        recalled_by = auth.uid(),
        recalled_from_cadre_id = COALESCE(claimed_by_cadre_id, cadre_id),
        recalled_from_team_id = team_id
    WHERE problem_id = _problem_id
      AND active = true;
  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Move problem back into an assignable state so the admin can reassign it.
  UPDATE public.problems
    SET status = 'reported'
    WHERE id = _problem_id
      AND status IN ('assigned','claimed','in_progress','work_started','acknowledged');

  INSERT INTO public.problem_updates (problem_id, status, note, updated_by)
    VALUES (_problem_id, 'reported',
            'Assignment reverted by super admin — ' || _reason,
            auth.uid());

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_kind, entity_id, metadata)
    VALUES (auth.uid(), 'recall_assignment', 'problem', _problem_id,
            jsonb_build_object('reason', _reason, 'affected', _count));

  RETURN _count;
END $$;

-- Super-admin: extend deadlines for a single entity's blueprint tasks
CREATE OR REPLACE FUNCTION public.admin_extend_entity_deadlines(_kind text, _id uuid, _days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only super admins can extend deadlines';
  END IF;
  IF _days IS NULL OR _days <= 0 OR _days > 60 THEN
    RAISE EXCEPTION 'Days must be between 1 and 60';
  END IF;
  IF _kind NOT IN ('problem','welfare','corruption') THEN
    RAISE EXCEPTION 'Unknown kind: %', _kind;
  END IF;

  IF _kind = 'problem' THEN
    UPDATE public.blueprint_tasks
      SET due_at = due_at + (_days || ' days')::interval
      WHERE problem_id = _id
        AND due_at IS NOT NULL
        AND status NOT IN ('done','skipped');
  ELSIF _kind = 'welfare' THEN
    UPDATE public.blueprint_tasks
      SET due_at = due_at + (_days || ' days')::interval
      WHERE welfare_id = _id
        AND due_at IS NOT NULL
        AND status NOT IN ('done','skipped');
  ELSE
    UPDATE public.blueprint_tasks
      SET due_at = due_at + (_days || ' days')::interval
      WHERE corruption_id = _id
        AND due_at IS NOT NULL
        AND status NOT IN ('done','skipped');
  END IF;
  GET DIAGNOSTICS _count = ROW_COUNT;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_kind, entity_id, metadata)
    VALUES (auth.uid(), 'extend_deadlines', _kind, _id,
            jsonb_build_object('days', _days, 'affected', _count));

  RETURN _count;
END $$;
