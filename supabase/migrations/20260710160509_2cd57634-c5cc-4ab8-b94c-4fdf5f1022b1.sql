-- 1. Cadre-filed flag on reports
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS is_cadre_filed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_by_cadre_id uuid REFERENCES public.cadres(id);

ALTER TABLE public.welfare_issues
  ADD COLUMN IF NOT EXISTS is_cadre_filed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_by_cadre_id uuid REFERENCES public.cadres(id);

ALTER TABLE public.corruption_reports
  ADD COLUMN IF NOT EXISTS is_cadre_filed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_by_cadre_id uuid REFERENCES public.cadres(id);

CREATE INDEX IF NOT EXISTS idx_problems_reported_by_cadre ON public.problems(reported_by_cadre_id) WHERE reported_by_cadre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_welfare_reported_by_cadre ON public.welfare_issues(reported_by_cadre_id) WHERE reported_by_cadre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corruption_reported_by_cadre ON public.corruption_reports(reported_by_cadre_id) WHERE reported_by_cadre_id IS NOT NULL;

-- 2. Fund assistance requests table
CREATE TABLE IF NOT EXISTS public.fund_assistance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text UNIQUE NOT NULL DEFAULT ('FA-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  category text NOT NULL,
  beneficiary_name text NOT NULL,
  beneficiary_age integer,
  beneficiary_phone text NOT NULL,
  beneficiary_address text,
  constituency text,
  city text,
  amount_requested numeric,
  purpose text NOT NULL,
  urgency text NOT NULL DEFAULT 'medium',
  supporting_docs text[] NOT NULL DEFAULT '{}',
  bank_details text,
  disclaimer_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  admin_notes text,
  disbursed_amount numeric,
  disbursed_at timestamptz,
  reviewed_by uuid,
  filed_by_cadre_id uuid REFERENCES public.cadres(id),
  is_cadre_filed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_assistance_requests TO authenticated;
GRANT INSERT ON public.fund_assistance_requests TO anon;
GRANT ALL ON public.fund_assistance_requests TO service_role;

ALTER TABLE public.fund_assistance_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit a fund request
CREATE POLICY "Anyone can submit fund requests"
  ON public.fund_assistance_requests FOR INSERT
  WITH CHECK (disclaimer_accepted = true);

-- Super admins see and manage all requests
CREATE POLICY "Admins view all fund requests"
  ON public.fund_assistance_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update fund requests"
  ON public.fund_assistance_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete fund requests"
  ON public.fund_assistance_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cadres see their own filed requests
CREATE POLICY "Cadres view their filed fund requests"
  ON public.fund_assistance_requests FOR SELECT
  TO authenticated
  USING (filed_by_cadre_id = public.current_cadre_id());

-- updated_at trigger
CREATE TRIGGER fund_requests_updated_at
  BEFORE UPDATE ON public.fund_assistance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();