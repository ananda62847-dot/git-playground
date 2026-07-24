CREATE TABLE public.corruption_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corruption_id uuid NOT NULL REFERENCES public.corruption_reports(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_label text,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corruption_internal_notes TO authenticated;
GRANT ALL ON public.corruption_internal_notes TO service_role;
ALTER TABLE public.corruption_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/moderators read internal notes"
  ON public.corruption_internal_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Admins/moderators write internal notes"
  ON public.corruption_internal_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Admins/moderators delete own internal notes"
  ON public.corruption_internal_notes FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) AND author_user_id = auth.uid());

CREATE INDEX idx_corruption_internal_notes_report ON public.corruption_internal_notes(corruption_id, created_at DESC);