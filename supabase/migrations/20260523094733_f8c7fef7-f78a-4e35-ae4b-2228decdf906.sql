
-- =========================================================
-- WELFARE / SCHEME ISSUE module
-- =========================================================

CREATE TABLE public.welfare_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL DEFAULT ('WS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),

  reporter_name  text NOT NULL,
  reporter_phone text NOT NULL,
  reporter_age   integer,

  city          text NOT NULL,
  constituency  text,
  area          text,
  pincode       text NOT NULL,
  address_line  text,
  latitude      numeric,
  longitude     numeric,

  scheme_type     text NOT NULL,    -- ration | pension | scholarship | housing | women | health | employment | certificates | other
  subcategory     text NOT NULL,
  scheme_name     text,
  application_id  text,
  months_pending  text,             -- '<1' | '1-3' | '3-6' | '6+'
  department      text,             -- routed dept id for department officers

  title       text NOT NULL,
  description text NOT NULL,
  urgency     text NOT NULL DEFAULT 'medium',

  status      text NOT NULL DEFAULT 'submitted',
       -- submitted | verified | dept_contacted | under_processing | awaiting_govt | resolved | citizen_confirmed
  proof_urls  text[] DEFAULT '{}'::text[],

  resolved_at         timestamptz,
  citizen_confirmed   boolean DEFAULT false,
  satisfaction_rating integer,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX welfare_issues_constituency_idx ON public.welfare_issues (constituency);
CREATE INDEX welfare_issues_scheme_type_idx  ON public.welfare_issues (scheme_type);
CREATE INDEX welfare_issues_department_idx   ON public.welfare_issues (department);
CREATE INDEX welfare_issues_status_idx       ON public.welfare_issues (status);
CREATE INDEX welfare_issues_created_idx      ON public.welfare_issues (created_at DESC);

CREATE TRIGGER trg_welfare_issues_updated
BEFORE UPDATE ON public.welfare_issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.welfare_issues ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + auth) can submit
CREATE POLICY "Anyone can submit welfare issues"
ON public.welfare_issues FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(reporter_name)) >= 1
  AND length(reporter_phone) >= 10
  AND length(pincode) = 6
  AND length(trim(description)) >= 5
  AND scheme_type IS NOT NULL
  AND subcategory IS NOT NULL
);

-- Public read (transparency, mirrors problems)
CREATE POLICY "Anyone can view welfare issues"
ON public.welfare_issues FOR SELECT
USING (true);

-- Admin manage
CREATE POLICY "Admins manage welfare issues"
ON public.welfare_issues FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Constituency moderators update in scope
CREATE POLICY "Moderators update welfare in their constituency"
ON public.welfare_issues FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.moderator_constituencies mc
    WHERE mc.user_id = auth.uid() AND mc.constituency = welfare_issues.constituency
  )
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.moderator_constituencies mc
    WHERE mc.user_id = auth.uid() AND mc.constituency = welfare_issues.constituency
  )
);

-- Department officers update for their dept
CREATE POLICY "Department officers update welfare in their dept"
ON public.welfare_issues FOR UPDATE
USING (
  has_role(auth.uid(), 'department'::app_role)
  AND department = current_officer_department()
)
WITH CHECK (
  has_role(auth.uid(), 'department'::app_role)
  AND department = current_officer_department()
);

-- =========================================================
-- WELFARE UPDATES (timeline)
-- =========================================================

CREATE TABLE public.welfare_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  welfare_issue_id uuid NOT NULL REFERENCES public.welfare_issues(id) ON DELETE CASCADE,
  status     text NOT NULL,
  note       text,
  proof_url  text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX welfare_updates_issue_idx ON public.welfare_updates (welfare_issue_id, created_at DESC);

ALTER TABLE public.welfare_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view welfare updates"
ON public.welfare_updates FOR SELECT USING (true);

CREATE POLICY "Admins add welfare updates"
ON public.welfare_updates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators add welfare updates in scope"
ON public.welfare_updates FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.welfare_issues w
    JOIN public.moderator_constituencies mc ON mc.constituency = w.constituency
    WHERE w.id = welfare_updates.welfare_issue_id AND mc.user_id = auth.uid()
  )
);

CREATE POLICY "Department officers add welfare updates"
ON public.welfare_updates FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'department'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.welfare_issues w
    WHERE w.id = welfare_updates.welfare_issue_id
      AND w.department = current_officer_department()
  )
);

CREATE POLICY "Public submitter initial update"
ON public.welfare_updates FOR INSERT
WITH CHECK (status = 'submitted');
