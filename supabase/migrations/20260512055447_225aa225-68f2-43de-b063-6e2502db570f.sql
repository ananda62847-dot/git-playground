GRANT INSERT (city, constituency, area, department, description, amount_demanded, incident_date) ON public.corruption_reports TO anon, authenticated;
GRANT SELECT (ticket_no) ON public.corruption_reports TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;