
-- Tokens table
CREATE TABLE public.notification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  fcm_token text NOT NULL,
  constituency text,
  department text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);

CREATE INDEX idx_notif_tokens_user ON public.notification_tokens(user_id);
CREATE INDEX idx_notif_tokens_role ON public.notification_tokens(role);
CREATE INDEX idx_notif_tokens_constituency ON public.notification_tokens(constituency);
CREATE INDEX idx_notif_tokens_department ON public.notification_tokens(department);

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens - select"
  ON public.notification_tokens FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own tokens - insert"
  ON public.notification_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own tokens - update"
  ON public.notification_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own tokens - delete"
  ON public.notification_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_notif_tokens_updated
  BEFORE UPDATE ON public.notification_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications history
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text,
  user_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  type text,
  severity text NOT NULL DEFAULT 'info',
  constituency text,
  department text,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_role ON public.notifications(role);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
