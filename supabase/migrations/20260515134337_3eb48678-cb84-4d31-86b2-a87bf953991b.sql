
-- Add new columns to corruption_reports
ALTER TABLE public.corruption_reports
  ADD COLUMN IF NOT EXISTS incident_type text,
  ADD COLUMN IF NOT EXISTS office_location text,
  ADD COLUMN IF NOT EXISTS person_involved text,
  ADD COLUMN IF NOT EXISTS person_name text,
  ADD COLUMN IF NOT EXISTS incident_time text,
  ADD COLUMN IF NOT EXISTS confirmed_good_faith boolean NOT NULL DEFAULT false;

-- Make evidence_url support multiple files via array (keep existing column for backward compat)
ALTER TABLE public.corruption_reports
  ADD COLUMN IF NOT EXISTS evidence_urls text[] DEFAULT '{}';

-- Re-affirm permissive insert policy for anon + authenticated
DROP POLICY IF EXISTS "Anyone submit corruption report" ON public.corruption_reports;
CREATE POLICY "Anyone submit corruption report"
ON public.corruption_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (length(trim(description)) >= 10);

-- Storage bucket for evidence (public read so admins can view via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('corruption-evidence', 'corruption-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Anyone upload corruption evidence" ON storage.objects;
CREATE POLICY "Anyone upload corruption evidence"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'corruption-evidence');

DROP POLICY IF EXISTS "Public read corruption evidence" ON storage.objects;
CREATE POLICY "Public read corruption evidence"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'corruption-evidence');
