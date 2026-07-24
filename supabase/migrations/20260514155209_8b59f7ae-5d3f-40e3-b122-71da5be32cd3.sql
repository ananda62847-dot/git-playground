-- ============================================================
-- ENTERPRISE SCALE INFRASTRUCTURE
-- ============================================================

-- 1. Required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- ============================================================
-- 2. MATERIALIZED VIEW: public stats (replaces get_public_stats COUNT storm)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_public_stats CASCADE;
CREATE MATERIALIZED VIEW public.mv_public_stats AS
SELECT
  (SELECT count(*) FROM public.suggestions) AS suggestions_count,
  (SELECT count(*) FROM public.grievances) AS grievances_count,
  (SELECT count(*) FROM public.volunteers) AS volunteers_count,
  (SELECT count(*) FROM public.problems) AS problems_count,
  (SELECT count(*) FROM public.problems WHERE status IN ('resolved','completed','citizen_confirmed')) AS resolved_count,
  (SELECT count(*) FROM public.cadres WHERE active = true) AS cadres_count,
  now() AS refreshed_at;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_public_stats_singleton ON public.mv_public_stats ((1));

-- Replace get_public_stats() to read from the cached MV (constant time)
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(
  suggestions_count bigint,
  grievances_count bigint,
  volunteers_count bigint,
  problems_count bigint,
  resolved_count bigint,
  cadres_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT suggestions_count, grievances_count, volunteers_count,
         problems_count, resolved_count, cadres_count
  FROM public.mv_public_stats;
$$;

-- ============================================================
-- 3. MATERIALIZED VIEW: city problem counts (live map)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_city_problem_counts CASCADE;
CREATE MATERIALIZED VIEW public.mv_city_problem_counts AS
SELECT
  COALESCE(city, 'Unknown') AS city,
  count(*) AS total,
  count(*) FILTER (WHERE status IN ('resolved','completed','citizen_confirmed')) AS resolved,
  count(*) FILTER (WHERE status NOT IN ('resolved','completed','citizen_confirmed')) AS pending
FROM public.problems
GROUP BY COALESCE(city, 'Unknown');

CREATE UNIQUE INDEX IF NOT EXISTS mv_city_problem_counts_city ON public.mv_city_problem_counts (city);

-- Replace city counts function to read MV
CREATE OR REPLACE FUNCTION public.get_city_problem_counts()
RETURNS TABLE(city text, total bigint, resolved bigint, pending bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT city, total, resolved, pending FROM public.mv_city_problem_counts;
$$;

-- ============================================================
-- 4. MATERIALIZED VIEW: constituency counts (admin heatmap)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_constituency_problem_counts CASCADE;
CREATE MATERIALIZED VIEW public.mv_constituency_problem_counts AS
SELECT
  COALESCE(constituency, 'Unknown') AS constituency,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'resolved') AS resolved,
  count(*) FILTER (WHERE status <> 'resolved') AS pending
FROM public.problems
GROUP BY COALESCE(constituency, 'Unknown');

CREATE UNIQUE INDEX IF NOT EXISTS mv_constituency_problem_counts_pk ON public.mv_constituency_problem_counts (constituency);

CREATE OR REPLACE FUNCTION public.get_constituency_problem_counts()
RETURNS TABLE(constituency text, total bigint, resolved bigint, pending bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT constituency, total, resolved, pending FROM public.mv_constituency_problem_counts;
$$;

-- ============================================================
-- 5. SAFE REFRESH HELPERS (called by pg_cron later)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_public_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_public_stats;
EXCEPTION WHEN OTHERS THEN
  -- fallback non-concurrent on first run if no rows yet
  REFRESH MATERIALIZED VIEW public.mv_public_stats;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_map_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_city_problem_counts;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_city_problem_counts;
  END;
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_constituency_problem_counts;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_constituency_problem_counts;
  END;
END; $$;

-- Seed the views once so reads work immediately
SELECT public.refresh_public_stats();
SELECT public.refresh_map_stats();

-- ============================================================
-- 6. PGMQ NOTIFICATION QUEUES (decouple SMS/email from request path)
-- ============================================================
SELECT pgmq.create('notifications_sms');
SELECT pgmq.create('notifications_email');

-- Enqueue helpers (callable from triggers or app code)
CREATE OR REPLACE FUNCTION public.enqueue_sms(_problem_id uuid, _trigger text)
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pgmq.send('notifications_sms', jsonb_build_object('problemId', _problem_id, 'trigger', _trigger));
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(_problem_id uuid, _trigger text)
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pgmq.send('notifications_email', jsonb_build_object('problemId', _problem_id, 'trigger', _trigger));
$$;

-- Lock execution down — only service role / definer chain can enqueue
REVOKE EXECUTE ON FUNCTION public.enqueue_sms(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(uuid, text) FROM anon, authenticated;