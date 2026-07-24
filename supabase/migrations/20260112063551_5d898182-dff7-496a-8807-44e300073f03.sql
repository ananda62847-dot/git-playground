-- Fix public submissions + constituency-based access for admin/moderator
-- has_role signature: public.has_role(_user_id uuid, _role app_role)

DO $$
BEGIN
  -- suggestions
  BEGIN EXECUTE 'DROP POLICY "Public can insert suggestions" ON public.suggestions'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Admins can view suggestions" ON public.suggestions'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Moderators can view suggestions for allowed constituencies" ON public.suggestions'; EXCEPTION WHEN undefined_object THEN END;

  -- grievances
  BEGIN EXECUTE 'DROP POLICY "Public can insert grievances" ON public.grievances'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Admins can view grievances" ON public.grievances'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Moderators can view grievances for allowed constituencies" ON public.grievances'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Staff can update grievance status" ON public.grievances'; EXCEPTION WHEN undefined_object THEN END;

  -- volunteers
  BEGIN EXECUTE 'DROP POLICY "Public can insert volunteers" ON public.volunteers'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Admins can view volunteers" ON public.volunteers'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Moderators can view volunteers for allowed constituencies" ON public.volunteers'; EXCEPTION WHEN undefined_object THEN END;

  -- areas
  BEGIN EXECUTE 'DROP POLICY "Public can read areas" ON public.areas'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Admins can manage areas" ON public.areas'; EXCEPTION WHEN undefined_object THEN END;

  -- moderator_constituencies
  BEGIN EXECUTE 'DROP POLICY "Admins can manage moderator constituencies" ON public.moderator_constituencies'; EXCEPTION WHEN undefined_object THEN END;
  BEGIN EXECUTE 'DROP POLICY "Users can read their own moderator constituencies" ON public.moderator_constituencies'; EXCEPTION WHEN undefined_object THEN END;
END $$;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_constituencies ENABLE ROW LEVEL SECURITY;

-- PUBLIC INSERT (fix 403 on forms)
CREATE POLICY "Public can insert suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can insert grievances"
ON public.grievances
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can insert volunteers"
ON public.volunteers
FOR INSERT
WITH CHECK (true);

-- AREAS dropdowns
CREATE POLICY "Public can read areas"
ON public.areas
FOR SELECT
USING (true);

-- Admin manage areas
CREATE POLICY "Admins can manage areas"
ON public.areas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ADMIN SELECT
CREATE POLICY "Admins can view suggestions"
ON public.suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view grievances"
ON public.grievances
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view volunteers"
ON public.volunteers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- MODERATOR SELECT (constituency-scoped)
CREATE POLICY "Moderators can view suggestions for allowed constituencies"
ON public.suggestions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'moderator'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.moderator_constituencies mc
    WHERE mc.user_id = auth.uid()
      AND mc.constituency = suggestions.constituency
  )
);

CREATE POLICY "Moderators can view grievances for allowed constituencies"
ON public.grievances
FOR SELECT
USING (
  public.has_role(auth.uid(), 'moderator'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.moderator_constituencies mc
    WHERE mc.user_id = auth.uid()
      AND mc.constituency = grievances.constituency
  )
);

CREATE POLICY "Moderators can view volunteers for allowed constituencies"
ON public.volunteers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'moderator'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.moderator_constituencies mc
    WHERE mc.user_id = auth.uid()
      AND mc.constituency = volunteers.constituency
  )
);

-- Staff update grievance status
CREATE POLICY "Staff can update grievance status"
ON public.grievances
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);

-- moderator_constituencies policies
CREATE POLICY "Admins can manage moderator constituencies"
ON public.moderator_constituencies
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can read their own moderator constituencies"
ON public.moderator_constituencies
FOR SELECT
USING (auth.uid() = user_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_constituency ON public.suggestions (constituency);
CREATE INDEX IF NOT EXISTS idx_grievances_constituency ON public.grievances (constituency);
CREATE INDEX IF NOT EXISTS idx_volunteers_constituency ON public.volunteers (constituency);
CREATE INDEX IF NOT EXISTS idx_moderator_constituencies_user ON public.moderator_constituencies (user_id);
