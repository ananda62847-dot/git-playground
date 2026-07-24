-- Restore Data API grants for public tables that lost them (root cause of fund-request insert blocks).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_assistance_requests TO authenticated;
GRANT INSERT ON public.fund_assistance_requests TO anon;
GRANT ALL ON public.fund_assistance_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_issues TO authenticated;
GRANT INSERT ON public.welfare_issues TO anon;
GRANT ALL ON public.welfare_issues TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.problems TO authenticated;
GRANT INSERT ON public.problems TO anon;
GRANT ALL ON public.problems TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.corruption_reports TO authenticated;
GRANT INSERT ON public.corruption_reports TO anon;
GRANT ALL ON public.corruption_reports TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_updates TO authenticated;
GRANT ALL ON public.welfare_updates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_updates TO authenticated;
GRANT ALL ON public.problem_updates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.corruption_internal_notes TO authenticated;
GRANT ALL ON public.corruption_internal_notes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_sticky_notes TO authenticated;
GRANT ALL ON public.admin_sticky_notes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_upcoming_tasks TO authenticated;
GRANT ALL ON public.admin_upcoming_tasks TO service_role;

-- Broad safety sweep: any public base table missing basic grants for authenticated + service_role gets them.
DO $$
DECLARE tbl record; has_priv boolean;
BEGIN
  FOR tbl IN SELECT c.relname AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE c.relkind='r' AND n.nspname='public' LOOP
    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants
      WHERE grantee='authenticated' AND table_schema='public' AND table_name=tbl.n
        AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.n);
    END IF;
    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants
      WHERE grantee='service_role' AND table_schema='public' AND table_name=tbl.n
        AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.n);
    END IF;
  END LOOP;
END $$;