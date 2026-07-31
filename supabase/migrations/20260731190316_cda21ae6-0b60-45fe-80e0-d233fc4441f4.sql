CREATE OR REPLACE FUNCTION public.admin_recall_assignment(_problem_id uuid, _reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  UPDATE public.escalations
    SET status = 'closed'
    WHERE problem_id = _problem_id
      AND status = 'open';

  UPDATE public.problems
    SET status = 'reported'
    WHERE id = _problem_id
      AND status IN ('assigned','claimed','in_progress','work_started','acknowledged','escalated');

  INSERT INTO public.problem_updates (problem_id, status, note, updated_by)
    VALUES (_problem_id, 'reported',
            'Assignment and escalation reverted by super admin — ' || _reason,
            auth.uid());

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_kind, entity_id, metadata)
    VALUES (auth.uid(), 'recall_assignment', 'problem', _problem_id,
            jsonb_build_object('reason', _reason, 'affected', _count, 'escalation_closed', true));

  RETURN _count;
END
$function$;