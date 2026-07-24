
-- Problems table
CREATE TABLE public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text UNIQUE NOT NULL DEFAULT ('MC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  reporter_name text NOT NULL,
  reporter_phone text NOT NULL,
  reporter_age integer,
  city text NOT NULL,
  constituency text,
  area text,
  polling_booth text,
  pincode text NOT NULL,
  address_line text,
  latitude numeric,
  longitude numeric,
  department text NOT NULL,
  category text NOT NULL,
  urgency text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'reported',
  severity text DEFAULT 'normal',
  sentiment text DEFAULT 'neutral',
  master_problem_id uuid REFERENCES public.problems(id) ON DELETE SET NULL,
  support_count integer NOT NULL DEFAULT 1,
  assigned_to text,
  resolved_at timestamptz,
  citizen_confirmed boolean DEFAULT false,
  satisfaction_rating integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_problems_constituency ON public.problems(constituency);
CREATE INDEX idx_problems_status ON public.problems(status);
CREATE INDEX idx_problems_department ON public.problems(department);
CREATE INDEX idx_problems_master ON public.problems(master_problem_id);
CREATE INDEX idx_problems_created ON public.problems(created_at DESC);

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view problems" ON public.problems FOR SELECT USING (true);
CREATE POLICY "Anyone can submit problems" ON public.problems FOR INSERT WITH CHECK (
  length(trim(reporter_name)) >= 1
  AND length(reporter_phone) >= 10
  AND length(pincode) = 6
  AND length(trim(description)) >= 5
);
CREATE POLICY "Admins can update problems" ON public.problems FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Moderators can update problems in their constituencies" ON public.problems FOR UPDATE
  USING (
    has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.moderator_constituencies mc
      WHERE mc.user_id = auth.uid() AND mc.constituency = problems.constituency
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.moderator_constituencies mc
      WHERE mc.user_id = auth.uid() AND mc.constituency = problems.constituency
    )
  );

CREATE TRIGGER update_problems_updated_at
BEFORE UPDATE ON public.problems
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updates timeline
CREATE TABLE public.problem_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  proof_url text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_problem_updates_problem ON public.problem_updates(problem_id, created_at DESC);

ALTER TABLE public.problem_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view problem updates" ON public.problem_updates FOR SELECT USING (true);
CREATE POLICY "Admins can add updates" ON public.problem_updates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Moderators can add updates for their constituency" ON public.problem_updates FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.problems p
      JOIN public.moderator_constituencies mc ON mc.constituency = p.constituency
      WHERE p.id = problem_updates.problem_id AND mc.user_id = auth.uid()
    )
  );

-- Media
CREATE TABLE public.problem_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  is_after_proof boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_problem_media_problem ON public.problem_media(problem_id);

ALTER TABLE public.problem_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view problem media" ON public.problem_media FOR SELECT USING (true);
CREATE POLICY "Anyone can attach media when reporting" ON public.problem_media FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can add proof media" ON public.problem_media FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Supporters ("me too")
CREATE TABLE public.problem_supporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  supporter_phone text NOT NULL,
  supporter_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, supporter_phone)
);

CREATE INDEX idx_problem_supporters_problem ON public.problem_supporters(problem_id);

ALTER TABLE public.problem_supporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view supporters count" ON public.problem_supporters FOR SELECT USING (true);
CREATE POLICY "Anyone can add support" ON public.problem_supporters FOR INSERT
  WITH CHECK (length(supporter_phone) >= 10);

-- Storage bucket for problem media
INSERT INTO storage.buckets (id, name, public) VALUES ('problem-media', 'problem-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read problem-media" ON storage.objects FOR SELECT
  USING (bucket_id = 'problem-media');
CREATE POLICY "Public upload problem-media" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'problem-media');
