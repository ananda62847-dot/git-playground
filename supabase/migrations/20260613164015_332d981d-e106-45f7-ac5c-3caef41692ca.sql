CREATE OR REPLACE FUNCTION public.compute_tier(_points integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _points >= 500 THEN 'diamond'
    WHEN _points >= 250 THEN 'platinum'
    WHEN _points >= 100 THEN 'gold'
    WHEN _points >= 30  THEN 'silver'
    ELSE 'bronze'
  END;
$$;

UPDATE public.cadres SET rank_tier = public.compute_tier(points);