
DROP MATERIALIZED VIEW IF EXISTS public.mv_public_stats CASCADE;
DROP FUNCTION IF EXISTS public.get_public_stats();

CREATE OR REPLACE VIEW public.v_public_stats AS
SELECT
  (SELECT count(*) FROM public.problems)                                          AS problems_count,
  (SELECT count(*) FROM public.welfare_issues)                                    AS welfare_count,
  (SELECT count(*) FROM public.citizen_suggestions)                               AS suggestions_count,
  (SELECT count(*) FROM public.corruption_reports)                                AS corruption_count,
  (SELECT count(*) FROM public.problems
     WHERE status = ANY (ARRAY['resolved','completed','citizen_confirmed']))      AS resolved_count,
  (SELECT count(*) FROM public.cadres WHERE active = true)                        AS cadres_count,
  (SELECT count(*) FROM public.problems
     WHERE created_at >= now() - interval '4 hours')                              AS reports_last_4h,
  (SELECT count(*) FROM public.problems
     WHERE status = ANY (ARRAY['resolved','completed','citizen_confirmed'])
       AND updated_at >= now() - interval '24 hours')                             AS resolved_last_24h,
  (SELECT count(*) FROM public.citizen_suggestions
     WHERE created_at >= now() - interval '4 hours')                              AS suggestions_last_4h,
  now() AS refreshed_at;

GRANT SELECT ON public.v_public_stats TO anon, authenticated, service_role;

CREATE FUNCTION public.get_public_stats()
RETURNS TABLE(
  problems_count bigint, welfare_count bigint, suggestions_count bigint, corruption_count bigint,
  resolved_count bigint, cadres_count bigint, total_submissions bigint,
  reports_last_4h bigint, resolved_last_24h bigint, suggestions_last_4h bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT problems_count, welfare_count, suggestions_count, corruption_count,
         resolved_count, cadres_count,
         (problems_count + welfare_count + suggestions_count + corruption_count),
         reports_last_4h, resolved_last_24h, suggestions_last_4h
  FROM public.v_public_stats;
$$;

CREATE OR REPLACE FUNCTION public.refresh_public_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN; END; $$;

DO $$
DECLARE
  cb_consts text[] := ARRAY[
    'Coimbatore North / கோயம்புத்தூர் வடக்கு','Coimbatore South / கோயம்புத்தூர் தெற்கு',
    'Kavundampalayam / கவுண்டம்பாளையம்','Kinathukadavu / கீனத்துக்கடவு','Mettupalayam / மேட்டுப்பாளையம்',
    'Pollachi / பொள்ளாச்சி','Singanallur / சிங்காநல்லூர்','Sulur / சூலூர்',
    'Thondamuthur / தொண்டாமுத்தூர்','Valparai / வால்பாறை'
  ];
  cats text[] := ARRAY['roads','water','electricity','sanitation','health','women_safety','education','other'];
  depts text[] := ARRAY['PWD','TWAD','TNEB','Municipality','Health','Police','Revenue','Education'];
  statuses text[] := ARRAY['pending','approved','assigned','in_progress','resolved','completed','citizen_confirmed'];
  problem_titles text[] := ARRAY[
    'Pothole near junction','Streetlight not working','Garbage overflow','Sewage leak on road',
    'Water supply disrupted','Stray dog menace','Broken footpath','Open manhole',
    'Tree fallen blocking road','Power line sagging','Illegal parking','Bus stop damaged',
    'Drainage blocked','Noise pollution at night','Encroachment on road'
  ];
  schemes text[] := ARRAY['Ration','Pension','Scholarship','Housing','Health','Subsidy','Certificate'];
  i int;
BEGIN
  IF (SELECT count(*) FROM public.problems) < 5 THEN
    FOR i IN 1..50 LOOP
      INSERT INTO public.problems(title, description, category, department, area, constituency, city, pincode, status, support_count, reporter_name, reporter_phone, created_at, updated_at)
      VALUES (
        problem_titles[1 + (i % array_length(problem_titles,1))] || ' #' || i,
        'Reported issue in Coimbatore. Seed #' || i,
        cats[1 + (i % array_length(cats,1))],
        depts[1 + (i % array_length(depts,1))],
        'Area ' || (1 + (i % 25)),
        cb_consts[1 + (i % array_length(cb_consts,1))],
        'Coimbatore / கோயம்புத்தூர்',
        '6410' || lpad((i % 100)::text, 2, '0'),
        statuses[1 + (i % array_length(statuses,1))],
        floor(random()*120)::int,
        'Test User ' || i,
        '9' || lpad((900000000 + i)::text, 9, '0'),
        now() - (random() * interval '20 days'),
        now() - (random() * interval '5 days')
      );
    END LOOP;
  END IF;

  IF (SELECT count(*) FROM public.welfare_issues) < 3 THEN
    FOR i IN 1..20 LOOP
      INSERT INTO public.welfare_issues(reporter_name, reporter_phone, city, constituency, area, pincode, scheme_type, subcategory, title, description, urgency, status, created_at)
      VALUES ('Welfare Test ' || i, '9' || lpad((800000000 + i)::text, 9, '0'),
        'Coimbatore / கோயம்புத்தூர்', cb_consts[1 + (i % array_length(cb_consts,1))],
        'Area ' || (1 + (i % 15)), '6410' || lpad((i % 100)::text, 2, '0'),
        schemes[1 + (i % array_length(schemes,1))],
        'general',
        schemes[1 + (i % array_length(schemes,1))] || ' issue #' || i,
        'Welfare scheme issue reported. Seed #' || i,
        'medium', 'submitted',
        now() - (random() * interval '15 days'));
    END LOOP;
  END IF;

  IF (SELECT count(*) FROM public.citizen_suggestions) < 3 THEN
    FOR i IN 1..15 LOOP
      INSERT INTO public.citizen_suggestions(title, description, category, area, constituency, status, support_count, created_at, updated_at)
      VALUES (
        'Idea: Improve ' || (ARRAY['roads','transport','parks','schools','clinics','market','library'])[1 + (i % 7)] || ' #' || i,
        'Suggestion proposal #' || i || ' for Coimbatore.',
        (ARRAY['infrastructure','roads','transport','water','sanitation','health','education','parks','environment'])[1 + (i % 9)],
        'Area ' || (1 + (i % 10)),
        cb_consts[1 + (i % array_length(cb_consts,1))],
        'approved',
        floor(random()*200)::int,
        now() - (random() * interval '12 days'),
        now() - (random() * interval '3 days')
      );
    END LOOP;
  END IF;

  IF (SELECT count(*) FROM public.corruption_reports) < 2 THEN
    FOR i IN 1..10 LOOP
      INSERT INTO public.corruption_reports(description, city, constituency, area, department, status, confirmed_good_faith, created_at)
      VALUES ('Bribe demanded for routine work. Seed #' || i,
        'Coimbatore / கோயம்புத்தூர்', cb_consts[1 + (i % array_length(cb_consts,1))],
        'Area ' || (1 + (i % 8)),
        (ARRAY['Revenue','Police','Municipality','TNEB','Water','Health'])[1 + (i % 6)],
        'submitted', true, now() - (random() * interval '10 days'));
    END LOOP;
  END IF;
END $$;
