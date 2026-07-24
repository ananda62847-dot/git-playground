-- Voice note columns
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS voice_note_url text,
  ADD COLUMN IF NOT EXISTS voice_transcript text;

ALTER TABLE public.welfare_issues
  ADD COLUMN IF NOT EXISTS voice_note_url text,
  ADD COLUMN IF NOT EXISTS voice_transcript text;

-- Public bucket for voice notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read + anon/authenticated insert (citizen reports are anonymous)
DROP POLICY IF EXISTS "voice notes public read" ON storage.objects;
CREATE POLICY "voice notes public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "voice notes anon insert" ON storage.objects;
CREATE POLICY "voice notes anon insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-notes');
