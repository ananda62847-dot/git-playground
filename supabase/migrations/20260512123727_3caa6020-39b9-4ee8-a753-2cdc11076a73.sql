REVOKE EXECUTE ON FUNCTION public.is_current_cadre_in_team(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_current_cadre_teammate(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_current_cadre_access_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_cadre_in_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_cadre_teammate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_current_cadre_access_assignment(uuid) TO authenticated;