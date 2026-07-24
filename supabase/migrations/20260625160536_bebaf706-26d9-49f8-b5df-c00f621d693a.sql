
-- 1. Professional tier function (6 tiers: recruit/volunteer/organizer/captain/leader/commander)
CREATE OR REPLACE FUNCTION public.compute_tier(_points integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _points >= 3000 THEN 'commander'
    WHEN _points >= 1500 THEN 'leader'
    WHEN _points >= 700  THEN 'captain'
    WHEN _points >= 300  THEN 'organizer'
    WHEN _points >= 100  THEN 'volunteer'
    ELSE 'recruit'
  END;
$$;

-- 2. Agent policies for autonomous AI Operations Center
CREATE TABLE IF NOT EXISTS public.agent_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL UNIQUE,
  mode text NOT NULL DEFAULT 'suggest', -- 'manual' | 'suggest' | 'auto'
  confidence_threshold integer NOT NULL DEFAULT 80,
  daily_cap integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_policies TO authenticated;
GRANT ALL ON public.agent_policies TO service_role;

ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage agent policies"
  ON public.agent_policies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "moderators read agent policies"
  ON public.agent_policies FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_agent_policies_updated
  BEFORE UPDATE ON public.agent_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.agent_policies (agent_type, mode, confidence_threshold, daily_cap) VALUES
  ('smart_assignment', 'auto', 75, 200),
  ('follow_up', 'auto', 70, 500),
  ('escalation', 'auto', 80, 100),
  ('prediction', 'suggest', 80, 200),
  ('verification', 'auto', 85, 300),
  ('sentiment', 'suggest', 75, 200),
  ('duplicate_detect', 'auto', 90, 500),
  ('admin_action', 'suggest', 85, 100)
ON CONFLICT (agent_type) DO NOTHING;

-- 3. Escalation execution checklist + level tracking
ALTER TABLE public.escalations
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalated_to_level text DEFAULT 'constituency',
  ADD COLUMN IF NOT EXISTS auto_escalated boolean NOT NULL DEFAULT false;

-- Default checklist seeded on insert if empty
CREATE OR REPLACE FUNCTION public.seed_escalation_checklist()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.checklist IS NULL OR jsonb_array_length(NEW.checklist) = 0 THEN
    NEW.checklist := jsonb_build_array(
      jsonb_build_object('key','notify_officer','label','Notify department officer','done',false),
      jsonb_build_object('key','file_memo','label','File action memo','done',false),
      jsonb_build_object('key','citizen_callback','label','Citizen callback completed','done',false),
      jsonb_build_object('key','field_visit','label','Field visit / on-ground verification','done',false),
      jsonb_build_object('key','evidence_upload','label','Upload supporting evidence','done',false),
      jsonb_build_object('key','supervisor_signoff','label','Supervisor sign-off','done',false)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_escalation_checklist ON public.escalations;
CREATE TRIGGER trg_escalation_checklist
  BEFORE INSERT ON public.escalations
  FOR EACH ROW EXECUTE FUNCTION public.seed_escalation_checklist();

-- Backfill existing rows
UPDATE public.escalations
  SET checklist = jsonb_build_array(
    jsonb_build_object('key','notify_officer','label','Notify department officer','done',false),
    jsonb_build_object('key','file_memo','label','File action memo','done',false),
    jsonb_build_object('key','citizen_callback','label','Citizen callback completed','done',false),
    jsonb_build_object('key','field_visit','label','Field visit / on-ground verification','done',false),
    jsonb_build_object('key','evidence_upload','label','Upload supporting evidence','done',false),
    jsonb_build_object('key','supervisor_signoff','label','Supervisor sign-off','done',false)
  )
  WHERE jsonb_array_length(COALESCE(checklist,'[]'::jsonb)) = 0;
