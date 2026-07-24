
-- 1. Constituency-membership flag on all report tables
ALTER TABLE public.problems                 ADD COLUMN IF NOT EXISTS belongs_to_constituency boolean NOT NULL DEFAULT false;
ALTER TABLE public.welfare_issues           ADD COLUMN IF NOT EXISTS belongs_to_constituency boolean NOT NULL DEFAULT false;
ALTER TABLE public.fund_assistance_requests ADD COLUMN IF NOT EXISTS belongs_to_constituency boolean NOT NULL DEFAULT false;
ALTER TABLE public.corruption_reports       ADD COLUMN IF NOT EXISTS belongs_to_constituency boolean NOT NULL DEFAULT false;

-- 2. Admin sticky notes board
CREATE TABLE IF NOT EXISTS public.admin_sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text,
  body text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'yellow',
  pinned boolean NOT NULL DEFAULT false,
  shared boolean NOT NULL DEFAULT false,
  is_task boolean NOT NULL DEFAULT false,
  done boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  problem_id uuid REFERENCES public.problems(id) ON DELETE SET NULL,
  welfare_id uuid REFERENCES public.welfare_issues(id) ON DELETE SET NULL,
  corruption_id uuid REFERENCES public.corruption_reports(id) ON DELETE SET NULL,
  fund_request_id uuid REFERENCES public.fund_assistance_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_sticky_notes TO authenticated;
GRANT ALL ON public.admin_sticky_notes TO service_role;

ALTER TABLE public.admin_sticky_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own + shared sticky notes"
  ON public.admin_sticky_notes FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    AND (shared = true OR owner_user_id = auth.uid())
  );

CREATE POLICY "Admins can create own sticky notes"
  ON public.admin_sticky_notes FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  );

CREATE POLICY "Owners can update own sticky notes"
  ON public.admin_sticky_notes FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete own sticky notes"
  ON public.admin_sticky_notes FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE TRIGGER trg_admin_sticky_notes_updated_at
  BEFORE UPDATE ON public.admin_sticky_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_admin_sticky_notes_owner ON public.admin_sticky_notes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sticky_notes_problem ON public.admin_sticky_notes(problem_id);
CREATE INDEX IF NOT EXISTS idx_admin_sticky_notes_welfare ON public.admin_sticky_notes(welfare_id);
CREATE INDEX IF NOT EXISTS idx_admin_sticky_notes_corruption ON public.admin_sticky_notes(corruption_id);
CREATE INDEX IF NOT EXISTS idx_admin_sticky_notes_fund ON public.admin_sticky_notes(fund_request_id);

-- 3. Upcoming tasks (per-report follow-up list, distinct from sticky notes)
CREATE TABLE IF NOT EXISTS public.admin_upcoming_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  notes text,
  done boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  problem_id uuid REFERENCES public.problems(id) ON DELETE CASCADE,
  welfare_id uuid REFERENCES public.welfare_issues(id) ON DELETE CASCADE,
  corruption_id uuid REFERENCES public.corruption_reports(id) ON DELETE CASCADE,
  fund_request_id uuid REFERENCES public.fund_assistance_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_upcoming_tasks TO authenticated;
GRANT ALL ON public.admin_upcoming_tasks TO service_role;

ALTER TABLE public.admin_upcoming_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view upcoming tasks"
  ON public.admin_upcoming_tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can create upcoming tasks"
  ON public.admin_upcoming_tasks FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  );

CREATE POLICY "Owners can update upcoming tasks"
  ON public.admin_upcoming_tasks FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete upcoming tasks"
  ON public.admin_upcoming_tasks FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE TRIGGER trg_admin_upcoming_tasks_updated_at
  BEFORE UPDATE ON public.admin_upcoming_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_admin_upcoming_tasks_owner ON public.admin_upcoming_tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_upcoming_tasks_problem ON public.admin_upcoming_tasks(problem_id);
CREATE INDEX IF NOT EXISTS idx_admin_upcoming_tasks_welfare ON public.admin_upcoming_tasks(welfare_id);
CREATE INDEX IF NOT EXISTS idx_admin_upcoming_tasks_corruption ON public.admin_upcoming_tasks(corruption_id);
CREATE INDEX IF NOT EXISTS idx_admin_upcoming_tasks_fund ON public.admin_upcoming_tasks(fund_request_id);
CREATE INDEX IF NOT EXISTS idx_admin_upcoming_tasks_due ON public.admin_upcoming_tasks(due_at) WHERE done = false;
