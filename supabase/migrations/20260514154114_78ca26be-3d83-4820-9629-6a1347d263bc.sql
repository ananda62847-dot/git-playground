-- Hot-path indexes to keep list/feed/dashboard queries fast under high concurrency.
-- All are CREATE IF NOT EXISTS and concurrent-safe in effect (no table rewrites).

-- Problems: feed/list ordering & filtering
CREATE INDEX IF NOT EXISTS idx_problems_created_at_desc ON public.problems (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_status_created ON public.problems (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_constituency_status_created ON public.problems (constituency, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_department_status_created ON public.problems (department, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_city ON public.problems (city);
CREATE INDEX IF NOT EXISTS idx_problems_resolved_at ON public.problems (resolved_at) WHERE resolved_at IS NOT NULL;

-- Cadres: leaderboard + lookups
CREATE INDEX IF NOT EXISTS idx_cadres_active_points ON public.cadres (active, points DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_cadres_constituency ON public.cadres (constituency);
CREATE INDEX IF NOT EXISTS idx_cadres_user_id ON public.cadres (user_id);

-- Suggestions / grievances: admin filters
CREATE INDEX IF NOT EXISTS idx_suggestions_constituency_created ON public.suggestions (constituency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grievances_constituency_created ON public.grievances (constituency, created_at DESC);

-- Social posts: feed ordering
CREATE INDEX IF NOT EXISTS idx_social_posts_pinned_created ON public.social_posts (pinned DESC, created_at DESC);

-- Problem updates / assignments: detail-page joins
CREATE INDEX IF NOT EXISTS idx_problem_updates_problem_created ON public.problem_updates (problem_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_assignments_problem_active ON public.problem_assignments (problem_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_problem_assignments_cadre ON public.problem_assignments (cadre_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_problem_assignments_team ON public.problem_assignments (team_id) WHERE active = true;

-- User roles + moderator scope: every RLS check hits these
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_moderator_constituencies_user ON public.moderator_constituencies (user_id);
CREATE INDEX IF NOT EXISTS idx_moderator_constituencies_constituency ON public.moderator_constituencies (constituency);

-- Email/SMS log: idempotency lookup
CREATE INDEX IF NOT EXISTS idx_sms_log_idem ON public.sms_log (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created ON public.email_outbox (status, created_at);