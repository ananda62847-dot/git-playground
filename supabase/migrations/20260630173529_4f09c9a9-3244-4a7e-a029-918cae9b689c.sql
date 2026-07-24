ALTER TABLE public.cadre_ai_tasks
  ADD COLUMN IF NOT EXISTS reply_text text,
  ADD COLUMN IF NOT EXISTS reply_attachments jsonb NOT NULL DEFAULT '[]'::jsonb;