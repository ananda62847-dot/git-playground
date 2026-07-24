
-- 1) HOLD + SOFT DELETE columns
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS on_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS held_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

ALTER TABLE public.welfare_issues
  ADD COLUMN IF NOT EXISTS on_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS held_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

ALTER TABLE public.fund_assistance_requests
  ADD COLUMN IF NOT EXISTS on_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS held_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

ALTER TABLE public.corruption_reports
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

-- 2) ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  entity_kind text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) CADRE HEARTBEAT (SECURITY DEFINER so RLS cannot block it)
CREATE OR REPLACE FUNCTION public.cadre_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cadres SET last_seen_at = now() WHERE user_id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.cadre_heartbeat() TO authenticated;

-- 4) ADMIN TOGGLE HOLD
CREATE OR REPLACE FUNCTION public.admin_toggle_hold(_kind text, _id uuid, _hold boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only super admins can hold/resume items';
  END IF;
  IF _kind = 'problem' THEN
    UPDATE public.problems SET on_hold=_hold, hold_reason=CASE WHEN _hold THEN _reason ELSE NULL END,
      held_at=CASE WHEN _hold THEN now() ELSE NULL END, held_by=CASE WHEN _hold THEN auth.uid() ELSE NULL END
      WHERE id=_id;
  ELSIF _kind = 'welfare' THEN
    UPDATE public.welfare_issues SET on_hold=_hold, hold_reason=CASE WHEN _hold THEN _reason ELSE NULL END,
      held_at=CASE WHEN _hold THEN now() ELSE NULL END, held_by=CASE WHEN _hold THEN auth.uid() ELSE NULL END
      WHERE id=_id;
  ELSIF _kind = 'fund' THEN
    UPDATE public.fund_assistance_requests SET on_hold=_hold, hold_reason=CASE WHEN _hold THEN _reason ELSE NULL END,
      held_at=CASE WHEN _hold THEN now() ELSE NULL END, held_by=CASE WHEN _hold THEN auth.uid() ELSE NULL END
      WHERE id=_id;
  ELSE
    RAISE EXCEPTION 'Unknown kind: %', _kind;
  END IF;
  INSERT INTO public.admin_audit_log(actor_user_id, action, entity_kind, entity_id, metadata)
    VALUES (auth.uid(), CASE WHEN _hold THEN 'hold' ELSE 'resume' END, _kind, _id, jsonb_build_object('reason', _reason));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_toggle_hold(text, uuid, boolean, text) TO authenticated;

-- 5) ADMIN SOFT DELETE
CREATE OR REPLACE FUNCTION public.admin_delete_issue(_kind text, _id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only super admins can delete items';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'A deletion reason is required';
  END IF;
  IF _kind = 'problem' THEN
    UPDATE public.problems SET deleted_at=now(), deleted_by=auth.uid(), deleted_reason=_reason WHERE id=_id;
  ELSIF _kind = 'welfare' THEN
    UPDATE public.welfare_issues SET deleted_at=now(), deleted_by=auth.uid(), deleted_reason=_reason WHERE id=_id;
  ELSIF _kind = 'fund' THEN
    UPDATE public.fund_assistance_requests SET deleted_at=now(), deleted_by=auth.uid(), deleted_reason=_reason WHERE id=_id;
  ELSIF _kind = 'corruption' THEN
    UPDATE public.corruption_reports SET deleted_at=now(), deleted_by=auth.uid(), deleted_reason=_reason WHERE id=_id;
  ELSE
    RAISE EXCEPTION 'Unknown kind: %', _kind;
  END IF;
  INSERT INTO public.admin_audit_log(actor_user_id, action, entity_kind, entity_id, metadata)
    VALUES (auth.uid(), 'delete', _kind, _id, jsonb_build_object('reason', _reason));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_issue(text, uuid, text) TO authenticated;

-- 6) BULK EXTEND DEADLINES on blueprint_tasks (which carry due_at)
CREATE OR REPLACE FUNCTION public.admin_bulk_extend_deadlines(_days integer, _through_date date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer := 0; _cutoff timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only super admins can extend deadlines';
  END IF;
  IF _days IS NULL OR _days <= 0 OR _days > 60 THEN
    RAISE EXCEPTION 'Days must be between 1 and 60';
  END IF;
  _cutoff := COALESCE((_through_date::timestamptz + interval '1 day'), now() + interval '1 day');
  UPDATE public.blueprint_tasks
    SET due_at = due_at + (_days || ' days')::interval
    WHERE due_at IS NOT NULL
      AND due_at <= _cutoff
      AND status NOT IN ('done','skipped');
  GET DIAGNOSTICS _count = ROW_COUNT;
  INSERT INTO public.admin_audit_log(actor_user_id, action, entity_kind, metadata)
    VALUES (auth.uid(), 'bulk_extend_deadlines', 'blueprint_tasks',
            jsonb_build_object('days', _days, 'through_date', _through_date, 'affected', _count));
  RETURN _count;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_bulk_extend_deadlines(integer, date) TO authenticated;

-- 7) ADMIN EDIT LOCATION (any report)
CREATE OR REPLACE FUNCTION public.admin_update_problem_location(
  _id uuid, _lat numeric, _lng numeric, _address text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only super admins can set report location';
  END IF;
  UPDATE public.problems
    SET latitude=_lat, longitude=_lng,
        address_line = COALESCE(NULLIF(trim(_address),''), address_line)
    WHERE id=_id;
  INSERT INTO public.admin_audit_log(actor_user_id, action, entity_kind, entity_id, metadata)
    VALUES (auth.uid(), 'set_location', 'problem', _id,
            jsonb_build_object('lat', _lat, 'lng', _lng, 'address', _address));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_update_problem_location(uuid, numeric, numeric, text) TO authenticated;
