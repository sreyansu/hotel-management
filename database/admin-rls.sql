-- Enable Admins to view all users and roles
-- Run this in Supabase SQL Editor

-- 1. Create helper function to check admin status (avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles
    WHERE user_id = auth.uid()
    ORDER BY CASE role 
      WHEN 'SUPER_ADMIN' THEN 1 
      WHEN 'HOTEL_ADMIN' THEN 2 
      ELSE 3 
    END
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Policy for Users table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('SUPER_ADMIN', 'HOTEL_ADMIN') LIMIT 1) IS NOT NULL
        OR auth.uid() = id -- User can see themselves
    );

-- 3. Policy for User Roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('SUPER_ADMIN', 'HOTEL_ADMIN') LIMIT 1) IS NOT NULL
        OR user_id = auth.uid() -- User can see their own role
    );
