
-- ============ GAMIFICATION ============
-- Add points/stars to cadres
ALTER TABLE public.cadres
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stars integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_tier text NOT NULL DEFAULT 'bronze';

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stars integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_count integer NOT NULL DEFAULT 0;

-- Points log (audit + transparency)
CREATE TABLE IF NOT EXISTS public.gamification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadre_id uuid,
  team_id uuid,
  problem_id uuid,
  event_type text NOT NULL,        -- 'claimed','resolved_fast','resolved','before_after_uploaded','escalation_resolved'
  points_awarded integer NOT NULL DEFAULT 0,
  stars_awarded integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view events" ON public.gamification_events FOR SELECT USING (true);
CREATE POLICY "System insert events" ON public.gamification_events FOR INSERT WITH CHECK (true);

-- Compute tier from points
CREATE OR REPLACE FUNCTION public.compute_tier(_points integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _points >= 1000 THEN 'diamond'
    WHEN _points >= 500  THEN 'platinum'
    WHEN _points >= 200  THEN 'gold'
    WHEN _points >= 50   THEN 'silver'
    ELSE 'bronze'
  END;
$$;

-- Award points when problem becomes resolved/completed via problem_updates
CREATE OR REPLACE FUNCTION public.award_points_on_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cadre_id uuid;
  _team_id uuid;
  _created timestamptz;
  _hours numeric;
  _pts integer := 0;
  _stars integer := 0;
BEGIN
  -- find the active assignment for this problem
  SELECT COALESCE(claimed_by_cadre_id, cadre_id), team_id
    INTO _cadre_id, _team_id
    FROM public.problem_assignments
    WHERE problem_id = NEW.problem_id AND active = true
    LIMIT 1;

  IF NEW.status IN ('resolved','completed','citizen_confirmed') THEN
    SELECT created_at INTO _created FROM public.problems WHERE id = NEW.problem_id;
    _hours := EXTRACT(EPOCH FROM (now() - _created))/3600.0;

    _pts := 30;
    IF _hours <= 24 THEN _pts := _pts + 30; _stars := 2;
    ELSIF _hours <= 72 THEN _pts := _pts + 15; _stars := 1;
    END IF;

    IF NEW.before_url IS NOT NULL AND NEW.after_url IS NOT NULL THEN
      _pts := _pts + 20; _stars := _stars + 1;
    END IF;

    IF _cadre_id IS NOT NULL THEN
      UPDATE public.cadres
        SET points = points + _pts,
            stars = stars + _stars,
            resolved_count = resolved_count + 1,
            rank_tier = public.compute_tier(points + _pts)
        WHERE id = _cadre_id;
    END IF;
    IF _team_id IS NOT NULL THEN
      UPDATE public.teams
        SET points = points + _pts,
            stars = stars + _stars,
            resolved_count = resolved_count + 1
        WHERE id = _team_id;
    END IF;

    INSERT INTO public.gamification_events (cadre_id, team_id, problem_id, event_type, points_awarded, stars_awarded, metadata)
    VALUES (_cadre_id, _team_id, NEW.problem_id, 'resolved', _pts, _stars, jsonb_build_object('hours', _hours));
  ELSIF NEW.before_url IS NOT NULL OR NEW.after_url IS NOT NULL THEN
    -- proof upload incremental
    IF _cadre_id IS NOT NULL THEN
      UPDATE public.cadres SET points = points + 5, rank_tier = public.compute_tier(points + 5) WHERE id = _cadre_id;
    END IF;
    INSERT INTO public.gamification_events (cadre_id, team_id, problem_id, event_type, points_awarded)
    VALUES (_cadre_id, _team_id, NEW.problem_id, 'proof_uploaded', 5);
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_award_points_on_update ON public.problem_updates;
CREATE TRIGGER trg_award_points_on_update
AFTER INSERT ON public.problem_updates
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_update();

-- Award small bonus on claim
CREATE OR REPLACE FUNCTION public.award_points_on_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.claimed_by_cadre_id IS NOT NULL AND (OLD.claimed_by_cadre_id IS NULL OR OLD.claimed_by_cadre_id <> NEW.claimed_by_cadre_id) THEN
    UPDATE public.cadres SET points = points + 5, rank_tier = public.compute_tier(points + 5)
      WHERE id = NEW.claimed_by_cadre_id;
    INSERT INTO public.gamification_events (cadre_id, team_id, problem_id, event_type, points_awarded)
    VALUES (NEW.claimed_by_cadre_id, NEW.team_id, NEW.problem_id, 'claimed', 5);
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_award_points_on_claim ON public.problem_assignments;
CREATE TRIGGER trg_award_points_on_claim
AFTER UPDATE OF claimed_by_cadre_id ON public.problem_assignments
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_claim();

-- Public leaderboard RPCs
CREATE OR REPLACE FUNCTION public.get_cadre_leaderboard(_constituency text DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, constituency text, city text, level text, profile_photo_url text, points integer, stars integer, resolved_count integer, rank_tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, constituency, city, level, profile_photo_url, points, stars, resolved_count, rank_tier
  FROM public.cadres
  WHERE active = true AND approved = true
    AND (_constituency IS NULL OR constituency = _constituency)
  ORDER BY points DESC, stars DESC, resolved_count DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_team_leaderboard(_constituency text DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, constituency text, city text, department text, points integer, stars integer, resolved_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, constituency, city, department, points, stars, resolved_count
  FROM public.teams
  WHERE active = true
    AND (_constituency IS NULL OR constituency = _constituency)
  ORDER BY points DESC, stars DESC, resolved_count DESC
  LIMIT _limit;
$$;

-- Constituency analytics RPC for choropleth
CREATE OR REPLACE FUNCTION public.get_constituency_breakdown(_constituency text)
RETURNS TABLE(category text, total bigint, resolved bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT category,
         count(*) as total,
         count(*) filter (where status IN ('resolved','completed','citizen_confirmed')) as resolved
  FROM public.problems
  WHERE constituency = _constituency
  GROUP BY category
  ORDER BY total DESC;
$$;
