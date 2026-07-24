CREATE TABLE public.translations_cache (
  source_hash text NOT NULL,
  target_lang text NOT NULL,
  translated text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_hash, target_lang)
);

GRANT SELECT ON public.translations_cache TO authenticated, anon;
GRANT ALL ON public.translations_cache TO service_role;

ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read translations"
  ON public.translations_cache FOR SELECT
  USING (true);

CREATE POLICY "service role writes"
  ON public.translations_cache FOR ALL
  TO service_role USING (true) WITH CHECK (true);