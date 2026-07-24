
-- Citizen Suggestions module (MVP, anonymous voting)

CREATE TABLE public.citizen_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text,
  area text,
  constituency text,
  ward_number text,
  photos text[] NOT NULL DEFAULT '{}'::text[],
  latitude numeric,
  longitude numeric,
  visibility text NOT NULL DEFAULT 'public', -- public | anonymous | private
  submitter_name text,
  submitter_phone text,
  device_fingerprint text,
  ip_hash text,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|voting|under_review|accepted|in_progress|completed|duplicate|archived
  support_count integer NOT NULL DEFAULT 0,
  dislike_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  priority_score integer NOT NULL DEFAULT 0,
  duplicate_of uuid REFERENCES public.citizen_suggestions(id) ON DELETE SET NULL,
  moderation_note text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_status ON public.citizen_suggestions(status);
CREATE INDEX idx_cs_constituency ON public.citizen_suggestions(constituency);
CREATE INDEX idx_cs_priority ON public.citizen_suggestions(priority_score DESC);
CREATE INDEX idx_cs_created ON public.citizen_suggestions(created_at DESC);

GRANT SELECT, INSERT ON public.citizen_suggestions TO anon, authenticated;
GRANT UPDATE, DELETE ON public.citizen_suggestions TO authenticated;
GRANT ALL ON public.citizen_suggestions TO service_role;

ALTER TABLE public.citizen_suggestions ENABLE ROW LEVEL SECURITY;

-- Public can read only approved/public-visible states
CREATE POLICY "Public read approved suggestions"
ON public.citizen_suggestions FOR SELECT
USING (
  status IN ('approved','voting','under_review','accepted','in_progress','completed')
  AND visibility IN ('public','anonymous')
);

CREATE POLICY "Admins read all suggestions"
ON public.citizen_suggestions FOR SELECT
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

CREATE POLICY "Anyone submit suggestion"
ON public.citizen_suggestions FOR INSERT
WITH CHECK (
  length(trim(title)) >= 5
  AND length(trim(description)) >= 10
  AND status = 'pending'
);

CREATE POLICY "Admins update suggestions"
ON public.citizen_suggestions FOR UPDATE
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

CREATE POLICY "Admins delete suggestions"
ON public.citizen_suggestions FOR DELETE
USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_cs_updated_at
BEFORE UPDATE ON public.citizen_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Votes
CREATE TABLE public.citizen_suggestion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.citizen_suggestions(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  device_fingerprint text NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, device_fingerprint)
);
CREATE INDEX idx_csv_suggestion ON public.citizen_suggestion_votes(suggestion_id);

GRANT SELECT, INSERT ON public.citizen_suggestion_votes TO anon, authenticated;
GRANT ALL ON public.citizen_suggestion_votes TO service_role;

ALTER TABLE public.citizen_suggestion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read votes" ON public.citizen_suggestion_votes
FOR SELECT USING (true);

CREATE POLICY "Public insert votes" ON public.citizen_suggestion_votes
FOR INSERT WITH CHECK (
  length(device_fingerprint) >= 8
  AND EXISTS (
    SELECT 1 FROM public.citizen_suggestions s
    WHERE s.id = suggestion_id
      AND s.status IN ('approved','voting','under_review')
  )
);

-- Comments
CREATE TABLE public.citizen_suggestion_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.citizen_suggestions(id) ON DELETE CASCADE,
  author_name text,
  comment text NOT NULL,
  device_fingerprint text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_csc_suggestion ON public.citizen_suggestion_comments(suggestion_id);

GRANT SELECT, INSERT ON public.citizen_suggestion_comments TO anon, authenticated;
GRANT UPDATE, DELETE ON public.citizen_suggestion_comments TO authenticated;
GRANT ALL ON public.citizen_suggestion_comments TO service_role;

ALTER TABLE public.citizen_suggestion_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read comments" ON public.citizen_suggestion_comments
FOR SELECT USING (hidden = false OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Public insert comments" ON public.citizen_suggestion_comments
FOR INSERT WITH CHECK (
  length(trim(comment)) >= 2 AND length(comment) <= 1000
);

CREATE POLICY "Admins moderate comments" ON public.citizen_suggestion_comments
FOR UPDATE USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Status logs
CREATE TABLE public.citizen_suggestion_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.citizen_suggestions(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cssl_suggestion ON public.citizen_suggestion_status_logs(suggestion_id);

GRANT SELECT ON public.citizen_suggestion_status_logs TO anon, authenticated;
GRANT INSERT ON public.citizen_suggestion_status_logs TO authenticated;
GRANT ALL ON public.citizen_suggestion_status_logs TO service_role;

ALTER TABLE public.citizen_suggestion_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read status logs" ON public.citizen_suggestion_status_logs
FOR SELECT USING (true);

CREATE POLICY "Admins write status logs" ON public.citizen_suggestion_status_logs
FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

-- Vote count + priority maintenance trigger
CREATE OR REPLACE FUNCTION public.cs_after_vote_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sid uuid;
BEGIN
  _sid := COALESCE(NEW.suggestion_id, OLD.suggestion_id);
  UPDATE public.citizen_suggestions s SET
    support_count = (SELECT count(*) FROM public.citizen_suggestion_votes v WHERE v.suggestion_id = _sid AND v.vote = 1),
    dislike_count = (SELECT count(*) FROM public.citizen_suggestion_votes v WHERE v.suggestion_id = _sid AND v.vote = -1)
  WHERE s.id = _sid;
  UPDATE public.citizen_suggestions s SET
    priority_score = GREATEST(0, support_count - dislike_count) + (comment_count * 2)
  WHERE s.id = _sid;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cs_vote_change
AFTER INSERT OR DELETE ON public.citizen_suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.cs_after_vote_change();

-- Comment count maintenance
CREATE OR REPLACE FUNCTION public.cs_after_comment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sid uuid;
BEGIN
  _sid := COALESCE(NEW.suggestion_id, OLD.suggestion_id);
  UPDATE public.citizen_suggestions s SET
    comment_count = (SELECT count(*) FROM public.citizen_suggestion_comments c WHERE c.suggestion_id = _sid AND c.hidden = false)
  WHERE s.id = _sid;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cs_comment_change
AFTER INSERT OR UPDATE OR DELETE ON public.citizen_suggestion_comments
FOR EACH ROW EXECUTE FUNCTION public.cs_after_comment_change();
