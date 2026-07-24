-- Fix user_roles visibility for self + allow service_role operations used by backend functions

-- Ensure RLS enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_constituencies ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies that block self-login and service_role inserts
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage user_roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

-- Allow backend functions (service role) to manage roles reliably
CREATE POLICY "Service role can manage user_roles"
ON public.user_roles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Moderator constituencies: allow service role inserts (used by create-user function)
DROP POLICY IF EXISTS "Admins can manage moderator_constituencies" ON public.moderator_constituencies;
DROP POLICY IF EXISTS "Moderators can view their constituencies" ON public.moderator_constituencies;

CREATE POLICY "Admins can manage moderator_constituencies"
ON public.moderator_constituencies
FOR ALL
USING (has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Moderators can view their constituencies"
ON public.moderator_constituencies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage moderator_constituencies"
ON public.moderator_constituencies
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
