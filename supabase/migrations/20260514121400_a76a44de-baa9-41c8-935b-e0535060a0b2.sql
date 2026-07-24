
-- Completed works gallery (super admin only)
CREATE TABLE IF NOT EXISTS public.completed_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  before_image_url text,
  after_image_url text,
  gallery_urls text[] DEFAULT '{}',
  category text,
  department text,
  city text,
  constituency text,
  area text,
  beneficiaries integer,
  cost_amount numeric,
  completed_on date,
  reviews jsonb DEFAULT '[]'::jsonb,
  highlight boolean DEFAULT false,
  published boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.completed_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published works"
  ON public.completed_works FOR SELECT
  USING (published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage completed works"
  ON public.completed_works FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_completed_works_published ON public.completed_works (published, created_at DESC);

-- Public bucket for completed works imagery
INSERT INTO storage.buckets (id, name, public)
VALUES ('completed-works', 'completed-works', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read completed-works"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'completed-works');

CREATE POLICY "Admins upload completed-works"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'completed-works' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update completed-works"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'completed-works' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete completed-works"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'completed-works' AND has_role(auth.uid(), 'admin'::app_role));
