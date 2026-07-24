
-- 1. escalated_at column on problem_assignments
ALTER TABLE public.problem_assignments
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- 2. cadres points default 100, backfill
ALTER TABLE public.cadres ALTER COLUMN points SET DEFAULT 100;
UPDATE public.cadres SET points = 100 WHERE points < 100;

-- 3. Index for AI inbox
CREATE INDEX IF NOT EXISTS idx_cadre_ai_tasks_cadre_status
  ON public.cadre_ai_tasks (cadre_id, status, created_at DESC);

-- 4. Access helpers (split view/edit)
CREATE OR REPLACE FUNCTION public.can_view_assignment(_problem_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.problem_assignments pa
    WHERE pa.problem_id = _problem_id AND pa.active = true
      AND ( pa.cadre_id = public.current_cadre_id()
         OR pa.claimed_by_cadre_id = public.current_cadre_id()
         OR (pa.team_id IS NOT NULL AND public.is_current_cadre_in_team(pa.team_id)) )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_assignment(_problem_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.problem_assignments pa
    WHERE pa.problem_id = _problem_id AND pa.active = true
      AND pa.escalated_at IS NULL
      AND ( pa.cadre_id = public.current_cadre_id()
         OR pa.claimed_by_cadre_id = public.current_cadre_id()
         OR (pa.team_id IS NOT NULL AND public.is_current_cadre_in_team(pa.team_id)) )
  );
$$;

-- 5. Re-point policies on problems & problem_updates to use new helpers
DROP POLICY IF EXISTS "Cadres view assigned problems" ON public.problems;
CREATE POLICY "Cadres view assigned problems" ON public.problems
  FOR SELECT TO authenticated
  USING (public.can_view_assignment(id));

DROP POLICY IF EXISTS "Cadres update assigned problems" ON public.problems;
CREATE POLICY "Cadres update assigned problems" ON public.problems
  FOR UPDATE TO authenticated
  USING (public.can_edit_assignment(id))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Cadres add updates" ON public.problem_updates;
CREATE POLICY "Cadres add updates" ON public.problem_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_assignment(problem_id));

-- 6. Escalation side-effects: when an escalation is opened, mark assignment escalated_at and apply point penalty
CREATE OR REPLACE FUNCTION public.handle_escalation_opened()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cadre uuid;
BEGIN
  IF NEW.status <> 'open' THEN RETURN NEW; END IF;

  UPDATE public.problem_assignments
    SET escalated_at = COALESCE(escalated_at, now())
    WHERE problem_id = NEW.problem_id AND active = true;

  SELECT COALESCE(claimed_by_cadre_id, cadre_id) INTO _cadre
    FROM public.problem_assignments
    WHERE problem_id = NEW.problem_id AND active = true LIMIT 1;

  IF _cadre IS NOT NULL THEN
    UPDATE public.cadres
      SET points = GREATEST(0, points - 25),
          rank_tier = public.compute_tier(GREATEST(0, points - 25))
      WHERE id = _cadre;
    INSERT INTO public.gamification_events (cadre_id, problem_id, event_type, points_awarded, metadata)
      VALUES (_cadre, NEW.problem_id, 'escalation_against', -25,
              jsonb_build_object('escalation_id', NEW.id, 'reason', NEW.reason));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_escalation_opened ON public.escalations;
CREATE TRIGGER trg_escalation_opened
  AFTER INSERT ON public.escalations
  FOR EACH ROW EXECUTE FUNCTION public.handle_escalation_opened();

-- 7. Citizen rating bonus/penalty (one-time per problem when satisfaction_rating is set)
CREATE OR REPLACE FUNCTION public.handle_citizen_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cadre uuid; _delta integer := 0;
BEGIN
  IF NEW.satisfaction_rating IS NULL THEN RETURN NEW; END IF;
  IF OLD.satisfaction_rating IS NOT DISTINCT FROM NEW.satisfaction_rating THEN RETURN NEW; END IF;

  IF NEW.satisfaction_rating >= 5 THEN _delta := 30;
  ELSIF NEW.satisfaction_rating = 4 THEN _delta := 10;
  ELSIF NEW.satisfaction_rating = 2 THEN _delta := -10;
  ELSIF NEW.satisfaction_rating <= 1 THEN _delta := -20;
  END IF;
  IF _delta = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(claimed_by_cadre_id, cadre_id) INTO _cadre
    FROM public.problem_assignments WHERE problem_id = NEW.id AND active = true LIMIT 1;

  IF _cadre IS NOT NULL THEN
    UPDATE public.cadres
      SET points = GREATEST(0, points + _delta),
          rank_tier = public.compute_tier(GREATEST(0, points + _delta))
      WHERE id = _cadre;
    INSERT INTO public.gamification_events (cadre_id, problem_id, event_type, points_awarded, metadata)
      VALUES (_cadre, NEW.id,
              CASE WHEN _delta > 0 THEN 'citizen_rating_bonus' ELSE 'citizen_rating_penalty' END,
              _delta, jsonb_build_object('rating', NEW.satisfaction_rating));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_citizen_rating ON public.problems;
CREATE TRIGGER trg_citizen_rating
  AFTER UPDATE OF satisfaction_rating ON public.problems
  FOR EACH ROW EXECUTE FUNCTION public.handle_citizen_rating();

-- 8. RPC: penalize SLA breach (called by ai-orchestrator; one-time guarded via gamification_events)
CREATE OR REPLACE FUNCTION public.apply_sla_breach(_problem_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cadre uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.gamification_events
     WHERE problem_id = _problem_id AND event_type = 'sla_breach'
  ) THEN RETURN; END IF;

  SELECT COALESCE(claimed_by_cadre_id, cadre_id) INTO _cadre
    FROM public.problem_assignments WHERE problem_id = _problem_id AND active = true LIMIT 1;
  IF _cadre IS NULL THEN RETURN; END IF;

  UPDATE public.cadres
    SET points = GREATEST(0, points - 15),
        rank_tier = public.compute_tier(GREATEST(0, points - 15))
    WHERE id = _cadre;
  INSERT INTO public.gamification_events (cadre_id, problem_id, event_type, points_awarded)
    VALUES (_cadre, _problem_id, 'sla_breach', -15);
END $$;

GRANT EXECUTE ON FUNCTION public.apply_sla_breach(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_view_assignment(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_assignment(uuid) TO authenticated, anon;
