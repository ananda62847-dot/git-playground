
CREATE TABLE IF NOT EXISTS public.department_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  department text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.department_officers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage department_officers"
  ON public.department_officers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Officer can view own dept row"
  ON public.department_officers FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_officer_department()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.department_officers WHERE user_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.cadres
  ADD COLUMN IF NOT EXISTS public_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_role_label text,
  ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_public_cadres(text);
CREATE OR REPLACE FUNCTION public.get_public_cadres(_constituency text DEFAULT NULL)
RETURNS TABLE (
  id uuid, name text, level text, role_title text, public_role_label text,
  area text, constituency text, city text, ward_number text,
  profile_photo_url text, phone text, show_phone boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, level, role_title, public_role_label,
         area, constituency, city, ward_number, profile_photo_url,
         CASE WHEN show_phone THEN phone ELSE NULL END as phone,
         show_phone
  FROM public.cadres
  WHERE active = true AND approved = true AND public_visible = true
    AND (_constituency IS NULL OR constituency = _constituency)
  ORDER BY level, name;
$$;

CREATE POLICY "Department officers view their dept problems"
  ON public.problems FOR SELECT
  USING (public.has_role(auth.uid(), 'department') AND department = public.current_officer_department());

CREATE POLICY "Department officers update their dept problems"
  ON public.problems FOR UPDATE
  USING (public.has_role(auth.uid(), 'department') AND department = public.current_officer_department())
  WITH CHECK (public.has_role(auth.uid(), 'department') AND department = public.current_officer_department());

CREATE POLICY "Department officers add updates"
  ON public.problem_updates FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'department') AND EXISTS (
      SELECT 1 FROM public.problems p
      WHERE p.id = problem_updates.problem_id
        AND p.department = public.current_officer_department()
    )
  );

CREATE POLICY "Department officers view escalations"
  ON public.escalations FOR SELECT
  USING (public.has_role(auth.uid(), 'department'));
