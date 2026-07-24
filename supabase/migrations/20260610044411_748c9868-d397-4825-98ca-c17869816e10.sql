
-- 1) Per-task structured evidence + criteria fields
ALTER TABLE public.blueprint_tasks
  ADD COLUMN IF NOT EXISTS evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS criteria_checked jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Generalize blueprint model to support welfare + corruption
ALTER TABLE public.resolution_blueprints
  ADD COLUMN IF NOT EXISTS welfare_id uuid REFERENCES public.welfare_issues(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS corruption_id uuid REFERENCES public.corruption_reports(id) ON DELETE CASCADE;

ALTER TABLE public.blueprint_tasks
  ADD COLUMN IF NOT EXISTS welfare_id uuid REFERENCES public.welfare_issues(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS corruption_id uuid REFERENCES public.corruption_reports(id) ON DELETE CASCADE;

ALTER TABLE public.blueprint_audit_log
  ADD COLUMN IF NOT EXISTS welfare_id uuid REFERENCES public.welfare_issues(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS corruption_id uuid REFERENCES public.corruption_reports(id) ON DELETE CASCADE;

-- problem_id can now be null when the blueprint targets welfare/corruption.
ALTER TABLE public.resolution_blueprints ALTER COLUMN problem_id DROP NOT NULL;
ALTER TABLE public.blueprint_tasks       ALTER COLUMN problem_id DROP NOT NULL;
ALTER TABLE public.blueprint_audit_log   ALTER COLUMN problem_id DROP NOT NULL;

-- Exactly-one-entity check
DO $$ BEGIN
  BEGIN ALTER TABLE public.resolution_blueprints DROP CONSTRAINT IF EXISTS rb_one_entity; EXCEPTION WHEN OTHERS THEN END;
  BEGIN ALTER TABLE public.blueprint_tasks       DROP CONSTRAINT IF EXISTS bt_one_entity; EXCEPTION WHEN OTHERS THEN END;
  BEGIN ALTER TABLE public.blueprint_audit_log   DROP CONSTRAINT IF EXISTS bal_one_entity; EXCEPTION WHEN OTHERS THEN END;
END $$;

ALTER TABLE public.resolution_blueprints ADD CONSTRAINT rb_one_entity CHECK (
  (problem_id IS NOT NULL)::int + (welfare_id IS NOT NULL)::int + (corruption_id IS NOT NULL)::int = 1
);
ALTER TABLE public.blueprint_tasks ADD CONSTRAINT bt_one_entity CHECK (
  (problem_id IS NOT NULL)::int + (welfare_id IS NOT NULL)::int + (corruption_id IS NOT NULL)::int = 1
);
ALTER TABLE public.blueprint_audit_log ADD CONSTRAINT bal_one_entity CHECK (
  (problem_id IS NOT NULL)::int + (welfare_id IS NOT NULL)::int + (corruption_id IS NOT NULL)::int = 1
);

-- 3) Gating function: a task is satisfied when all required evidence has ≥1 uploaded file
--    AND all success criteria are checked.
CREATE OR REPLACE FUNCTION public.bt_task_satisfied(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req text[]; _crit text[]; _files jsonb; _checked jsonb; _label text;
BEGIN
  SELECT evidence_required, success_criteria, evidence_files, criteria_checked
    INTO _req, _crit, _files, _checked
    FROM public.blueprint_tasks WHERE id = _task_id;

  IF _req IS NOT NULL THEN
    FOREACH _label IN ARRAY _req LOOP
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(_files,'[]'::jsonb)) e
        WHERE e->>'label' = _label
      ) THEN RETURN false; END IF;
    END LOOP;
  END IF;

  IF _crit IS NOT NULL THEN
    FOREACH _label IN ARRAY _crit LOOP
      IF COALESCE((_checked->_label->>'checked')::boolean, false) IS NOT TRUE THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.bt_can_start(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _deps uuid[]; _d uuid;
BEGIN
  SELECT depends_on INTO _deps FROM public.blueprint_tasks WHERE id = _task_id;
  IF _deps IS NULL OR array_length(_deps,1) IS NULL THEN RETURN true; END IF;
  FOREACH _d IN ARRAY _deps LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.blueprint_tasks
      WHERE id = _d AND status IN ('done','skipped') AND public.bt_task_satisfied(id)
    ) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

-- BEFORE UPDATE trigger enforcing both gates
CREATE OR REPLACE FUNCTION public.bt_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'in_progress' AND NOT public.bt_can_start(NEW.id) THEN
      RAISE EXCEPTION 'Cannot start task: prerequisite tasks have not uploaded all required evidence or checked all success criteria.';
    END IF;
    IF NEW.status = 'done' AND NOT public.bt_task_satisfied(NEW.id) THEN
      RAISE EXCEPTION 'Cannot mark task done: upload all required evidence and tick every success criterion first.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bt_gate ON public.blueprint_tasks;
CREATE TRIGGER trg_bt_gate
BEFORE UPDATE ON public.blueprint_tasks
FOR EACH ROW EXECUTE FUNCTION public.bt_gate();

-- 4) Update the auto-close trigger to close the right entity
CREATE OR REPLACE FUNCTION public.btasks_maybe_close_problem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _remaining int;
BEGIN
  IF NEW.status <> 'done' THEN RETURN NEW; END IF;

  SELECT count(*) INTO _remaining
    FROM public.blueprint_tasks
    WHERE blueprint_id = NEW.blueprint_id
      AND status NOT IN ('done','skipped');
  IF _remaining > 0 THEN RETURN NEW; END IF;

  IF NEW.problem_id IS NOT NULL THEN
    UPDATE public.problems
      SET status = 'resolved', resolved_at = COALESCE(resolved_at, now())
      WHERE id = NEW.problem_id
        AND status NOT IN ('resolved','completed','citizen_confirmed','rejected','duplicate');
  ELSIF NEW.welfare_id IS NOT NULL THEN
    UPDATE public.welfare_issues
      SET status = 'resolved', resolved_at = COALESCE(resolved_at, now())
      WHERE id = NEW.welfare_id
        AND status NOT IN ('resolved','citizen_confirmed','closed','rejected');
  ELSIF NEW.corruption_id IS NOT NULL THEN
    UPDATE public.corruption_reports
      SET status = 'closed'
      WHERE id = NEW.corruption_id
        AND status NOT IN ('closed','rejected');
  END IF;
  RETURN NEW;
END $$;

-- 5) Update btasks_audit to handle multi-entity (use whichever id is present)
CREATE OR REPLACE FUNCTION public.btasks_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action public.blueprint_audit_action;
  _before jsonb := null;
  _after jsonb := null;
  _task_id uuid; _bp uuid;
  _prob uuid; _wel uuid; _cor uuid;
BEGIN
  IF tg_op = 'INSERT' THEN
    _action := 'task_added'; _after := to_jsonb(new);
    _task_id := new.id; _bp := new.blueprint_id;
    _prob := new.problem_id; _wel := new.welfare_id; _cor := new.corruption_id;
  ELSIF tg_op = 'DELETE' THEN
    _action := 'task_removed'; _before := to_jsonb(old);
    _task_id := old.id; _bp := old.blueprint_id;
    _prob := old.problem_id; _wel := old.welfare_id; _cor := old.corruption_id;
  ELSE
    _before := to_jsonb(old); _after := to_jsonb(new);
    _task_id := new.id; _bp := new.blueprint_id;
    _prob := new.problem_id; _wel := new.welfare_id; _cor := new.corruption_id;
    IF new.status IS DISTINCT FROM old.status THEN
      _action := CASE new.status
        WHEN 'in_progress' THEN 'task_started'::public.blueprint_audit_action
        WHEN 'done' THEN 'task_completed'::public.blueprint_audit_action
        WHEN 'blocked' THEN 'task_blocked'::public.blueprint_audit_action
        WHEN 'skipped' THEN 'task_skipped'::public.blueprint_audit_action
        ELSE 'task_edited'::public.blueprint_audit_action
      END;
    ELSIF new.evidence_files IS DISTINCT FROM old.evidence_files THEN
      _action := 'proof_uploaded';
    ELSIF new.criteria_checked IS DISTINCT FROM old.criteria_checked THEN
      _action := 'task_edited';
    ELSIF (new.owner_cadre_id IS DISTINCT FROM old.owner_cadre_id)
       OR (new.owner_team_id IS DISTINCT FROM old.owner_team_id) THEN
      _action := 'owner_changed';
    ELSIF new.due_at IS DISTINCT FROM old.due_at THEN
      _action := 'due_changed';
    ELSIF new.seq IS DISTINCT FROM old.seq THEN
      _action := 'task_reordered';
    ELSE
      _action := 'task_edited';
    END IF;
  END IF;

  INSERT INTO public.blueprint_audit_log(blueprint_id, problem_id, welfare_id, corruption_id, task_id, action, actor_user_id, before, after)
  VALUES (_bp, _prob, _wel, _cor, _task_id, _action, auth.uid(), _before, _after);

  RETURN COALESCE(new, old);
END $$;

-- 6) Auto-fire blueprint generation when a welfare report is created
CREATE OR REPLACE FUNCTION public.on_welfare_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fire_edge_fn('ai-resolution-blueprint', jsonb_build_object('welfare_id', new.id));
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS trg_welfare_inserted ON public.welfare_issues;
CREATE TRIGGER trg_welfare_inserted
AFTER INSERT ON public.welfare_issues
FOR EACH ROW EXECUTE FUNCTION public.on_welfare_inserted();

-- 7) RLS policies — relax existing to allow welfare/corruption owners to read/write tasks
DROP POLICY IF EXISTS "blueprint_tasks_select" ON public.blueprint_tasks;
CREATE POLICY "blueprint_tasks_select" ON public.blueprint_tasks
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (problem_id   IS NOT NULL AND public.can_view_assignment(problem_id))
  OR (welfare_id   IS NOT NULL AND public.can_current_cadre_access_welfare(welfare_id))
  OR (corruption_id IS NOT NULL AND public.can_current_cadre_access_corruption(corruption_id))
);

DROP POLICY IF EXISTS "blueprint_tasks_update" ON public.blueprint_tasks;
CREATE POLICY "blueprint_tasks_update" ON public.blueprint_tasks
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (problem_id   IS NOT NULL AND public.can_edit_assignment(problem_id))
  OR (welfare_id   IS NOT NULL AND public.can_current_cadre_access_welfare(welfare_id))
  OR (corruption_id IS NOT NULL AND public.can_current_cadre_access_corruption(corruption_id))
);

DROP POLICY IF EXISTS "blueprint_audit_select" ON public.blueprint_audit_log;
CREATE POLICY "blueprint_audit_select" ON public.blueprint_audit_log
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (problem_id   IS NOT NULL AND public.can_view_assignment(problem_id))
  OR (welfare_id   IS NOT NULL AND public.can_current_cadre_access_welfare(welfare_id))
  OR (corruption_id IS NOT NULL AND public.can_current_cadre_access_corruption(corruption_id))
);

DROP POLICY IF EXISTS "resolution_blueprints_select" ON public.resolution_blueprints;
CREATE POLICY "resolution_blueprints_select" ON public.resolution_blueprints
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (problem_id   IS NOT NULL AND public.can_view_assignment(problem_id))
  OR (welfare_id   IS NOT NULL AND public.can_current_cadre_access_welfare(welfare_id))
  OR (corruption_id IS NOT NULL AND public.can_current_cadre_access_corruption(corruption_id))
);
