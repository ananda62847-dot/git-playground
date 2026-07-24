-- SMS log for Twilio status updates
CREATE TABLE public.sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid,
  trigger_code text NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  provider_sid text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX idx_sms_log_problem ON public.sms_log(problem_id);
CREATE INDEX idx_sms_log_created ON public.sms_log(created_at DESC);
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sms_log" ON public.sms_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Email outbox queue for SMTP notifications
CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid,
  trigger_code text NOT NULL,
  recipient_email text NOT NULL,
  recipient_role text,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX idx_email_outbox_status ON public.email_outbox(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_email_outbox_problem ON public.email_outbox(problem_id);
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email_outbox" ON public.email_outbox FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper: resolve recipient emails for a notification trigger
-- Returns rows {email, role} for: super_admins, constituency moderators, dept officers, cadres
CREATE OR REPLACE FUNCTION public.get_notification_recipients(
  _problem_id uuid,
  _trigger text
) RETURNS TABLE(email text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _problem RECORD;
BEGIN
  SELECT * INTO _problem FROM problems WHERE id = _problem_id;
  IF _problem IS NULL THEN RETURN; END IF;

  -- Super admins (always for REPORT_CREATED, CITIZEN_CONFIRMED)
  IF _trigger IN ('REPORT_CREATED','CITIZEN_CONFIRMED') THEN
    RETURN QUERY
      SELECT p.email, 'super_admin'::text
      FROM user_roles ur JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'admin' AND p.email IS NOT NULL;
  END IF;

  -- Constituency admins (most triggers)
  IF _trigger IN ('REPORT_CREATED','REPORT_ASSIGNED','WORK_STARTED','PROGRESS_UPDATED','WORK_COMPLETED','CITIZEN_CONFIRMED') THEN
    RETURN QUERY
      SELECT p.email, 'constituency_admin'::text
      FROM moderator_constituencies mc
      JOIN profiles p ON p.user_id = mc.user_id
      WHERE mc.constituency = _problem.constituency AND p.email IS NOT NULL;
  END IF;

  -- Department officers (REPORT_CREATED, WORK_COMPLETED)
  IF _trigger IN ('REPORT_CREATED','WORK_COMPLETED') THEN
    RETURN QUERY
      SELECT p.email, 'department_admin'::text
      FROM department_officers d JOIN profiles p ON p.user_id = d.user_id
      WHERE d.department = _problem.department AND p.email IS NOT NULL;
  END IF;

  -- Assigned cadres + team members (REPORT_ASSIGNED, CITIZEN_CONFIRMED)
  IF _trigger IN ('REPORT_ASSIGNED','CITIZEN_CONFIRMED') THEN
    RETURN QUERY
      SELECT c.email, 'cadre'::text
      FROM problem_assignments pa
      LEFT JOIN team_members tm ON tm.team_id = pa.team_id
      JOIN cadres c ON c.id = COALESCE(pa.cadre_id, pa.claimed_by_cadre_id, tm.cadre_id)
      WHERE pa.problem_id = _problem_id AND pa.active = true AND c.email IS NOT NULL;
  END IF;
END;
$$;

-- Performance indexes for scale (1Cr+ rows)
CREATE INDEX IF NOT EXISTS idx_problems_constituency_status_created ON public.problems(constituency, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_department_status_created ON public.problems(department, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_status_created ON public.problems(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_created_brin ON public.problems USING BRIN(created_at);
CREATE INDEX IF NOT EXISTS idx_problem_assignments_active ON public.problem_assignments(problem_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_cadres_constituency_active ON public.cadres(constituency, active, approved);
CREATE INDEX IF NOT EXISTS idx_cadres_points_desc ON public.cadres(points DESC) WHERE active = true AND approved = true;