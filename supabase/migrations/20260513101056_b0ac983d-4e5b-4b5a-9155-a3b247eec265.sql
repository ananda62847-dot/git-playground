-- 1) Default cadres to hidden in directory; phone already defaults to hidden
ALTER TABLE public.cadres ALTER COLUMN public_visible SET DEFAULT false;

-- Existing rows: keep current opt-in choices; only flip the brand-new defaults for rows that were created with the old default and have never been customised by an admin.
-- We don't have an audit field, so we leave existing rows alone. Admins can flip per cadre.

-- 2) Recompute rank_tier for all cadres (fix stuck-on-bronze)
UPDATE public.cadres SET rank_tier = public.compute_tier(points);

-- 3) Trigger to keep rank_tier in sync whenever points change
CREATE OR REPLACE FUNCTION public.cadres_sync_rank_tier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    NEW.rank_tier := public.compute_tier(NEW.points);
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_cadres_sync_rank_tier ON public.cadres;
CREATE TRIGGER trg_cadres_sync_rank_tier
BEFORE UPDATE ON public.cadres
FOR EACH ROW EXECUTE FUNCTION public.cadres_sync_rank_tier();

-- 4) team_members.role_in_team values: allow free text, but normalise legacy NULLs
UPDATE public.team_members SET role_in_team = 'member' WHERE role_in_team IS NULL;