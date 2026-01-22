-- Drop the restrictive policies and recreate them as permissive
-- First, fix profiles table policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Co-admins can create caller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Co-admins can view caller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create permissive policies for profiles
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can view caller profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'co_admin'::app_role) AND 
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = profiles.user_id 
    AND ur.role = 'customer_caller'::app_role
  )
);

CREATE POLICY "Co-admins can insert caller profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'co_admin'::app_role));

-- Fix user_roles table policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Co-admins can create caller roles" ON public.user_roles;
DROP POLICY IF EXISTS "Co-admins can view caller roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Create permissive policies for user_roles
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Co-admins can create caller roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'co_admin'::app_role) AND role = 'customer_caller'::app_role);

CREATE POLICY "Co-admins can view caller roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'co_admin'::app_role) AND role = 'customer_caller'::app_role);

-- Fix session_logs policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.session_logs;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.session_logs;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.session_logs;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.session_logs;

CREATE POLICY "Users can insert own sessions"
ON public.session_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.session_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions"
ON public.session_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.session_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));