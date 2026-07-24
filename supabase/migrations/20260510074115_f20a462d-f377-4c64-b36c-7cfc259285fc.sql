
-- Cadre members (TVK volunteers/workers per constituency)
CREATE TABLE public.cadres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text NOT NULL,
  constituency text,
  area text,
  level text NOT NULL DEFAULT 'booth_volunteer',
    -- state_admin / district_head / constituency_coordinator / ward_organizer / booth_volunteer
  role_title text,
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cadres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cadres" ON public.cadres FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators view cadres in their constituency" ON public.cadres FOR SELECT
  USING (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=cadres.constituency
  ));
CREATE POLICY "Moderators update cadres in their constituency" ON public.cadres FOR UPDATE
  USING (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=cadres.constituency
  ));
CREATE POLICY "Moderators insert cadres in their constituency" ON public.cadres FOR INSERT
  WITH CHECK (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=cadres.constituency
  ));

CREATE INDEX idx_cadres_constituency ON public.cadres(constituency);

-- Teams (response teams, can group cadres)
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  city text,
  constituency text,
  department text,
  lead_cadre_id uuid REFERENCES public.cadres(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators view teams in their constituency" ON public.teams FOR SELECT
  USING (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=teams.constituency
  ));
CREATE POLICY "Moderators manage teams in their constituency" ON public.teams FOR INSERT
  WITH CHECK (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=teams.constituency
  ));
CREATE POLICY "Moderators update teams in their constituency" ON public.teams FOR UPDATE
  USING (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=teams.constituency
  ));

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  cadre_id uuid NOT NULL REFERENCES public.cadres(id) ON DELETE CASCADE,
  role_in_team text DEFAULT 'member',
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, cadre_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage team_members" ON public.team_members FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators manage team_members in scope" ON public.team_members FOR ALL
  USING (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM teams t JOIN moderator_constituencies mc ON mc.constituency=t.constituency
    WHERE t.id=team_members.team_id AND mc.user_id=auth.uid()
  ))
  WITH CHECK (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM teams t JOIN moderator_constituencies mc ON mc.constituency=t.constituency
    WHERE t.id=team_members.team_id AND mc.user_id=auth.uid()
  ));

-- Problem assignments (link a problem to a team or cadre)
CREATE TABLE public.problem_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  cadre_id uuid REFERENCES public.cadres(id) ON DELETE SET NULL,
  assigned_by uuid,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.problem_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view assignments" ON public.problem_assignments FOR SELECT USING (true);
CREATE POLICY "Admins manage assignments" ON public.problem_assignments FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators assign in their constituency" ON public.problem_assignments FOR INSERT
  WITH CHECK (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM problems p JOIN moderator_constituencies mc ON mc.constituency=p.constituency
    WHERE p.id=problem_assignments.problem_id AND mc.user_id=auth.uid()
  ));

-- Satisfaction surveys after resolution
CREATE TABLE public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  rating int NOT NULL,
  resolution_quality int,
  speed int,
  staff_behavior int,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view surveys" ON public.satisfaction_surveys FOR SELECT USING (true);
CREATE POLICY "Anyone submit survey" ON public.satisfaction_surveys FOR INSERT
  WITH CHECK (rating BETWEEN 1 AND 5);

-- Anonymous corruption reports (admin-only read)
CREATE TABLE public.corruption_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL DEFAULT ('CR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  city text,
  constituency text,
  area text,
  department text,
  description text NOT NULL,
  evidence_url text,
  amount_demanded numeric,
  incident_date date,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.corruption_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone submit corruption report" ON public.corruption_reports FOR INSERT
  WITH CHECK (length(trim(description)) >= 20);
CREATE POLICY "Admins read corruption reports" ON public.corruption_reports FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update corruption reports" ON public.corruption_reports FOR UPDATE
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Social feed posts
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid,
  author_name text,
  city text,
  constituency text,
  category text DEFAULT 'announcement',
  title text,
  body text NOT NULL,
  image_url text,
  pinned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view posts" ON public.social_posts FOR SELECT USING (true);
CREATE POLICY "Admins manage posts" ON public.social_posts FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators post in their constituency" ON public.social_posts FOR INSERT
  WITH CHECK (has_role(auth.uid(),'moderator'::app_role) AND EXISTS (
    SELECT 1 FROM moderator_constituencies mc WHERE mc.user_id=auth.uid() AND mc.constituency=social_posts.constituency
  ));

-- Triggers updated_at
CREATE TRIGGER trg_cadres_uat BEFORE UPDATE ON public.cadres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_teams_uat BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.problems;
ALTER PUBLICATION supabase_realtime ADD TABLE public.problem_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.problem_assignments;
