-- Schedule recurring jobs. Safe to re-run: unschedule existing jobs first.
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-public-stats');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-map-stats');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('drain-notifications');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'refresh-public-stats',
  '* * * * *',
  $$SELECT public.refresh_public_stats();$$
);

SELECT cron.schedule(
  'refresh-map-stats',
  '*/2 * * * *',
  $$SELECT public.refresh_map_stats();$$
);

SELECT cron.schedule(
  'drain-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wyscjhlssjgsamjzwujp.supabase.co/functions/v1/process-notifications',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2NqaGxzc2pnc2Ftanp3dWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODkwODUsImV4cCI6MjA5NDE2NTA4NX0.jzLWUw04qXQf3tFlDD6pbcYQQrK5KLygaP_V7WDZBHc"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);