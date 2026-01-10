-- Fix RLS Policies for Users and User Roles
-- Run this in Supabase SQL Editor to fix the "Navbar not updating" issue

-- 1. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (and ensure we are starting fresh)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

-- 3. Create permissive policies for the owner
-- Allow users to see their own profile
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- 4. Allow reading roles
-- This is critical for the "Joined" query in App.tsx
CREATE POLICY "Users can read own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- 5. Ensure "CUSTOMER" role exists for all current users (in case trigger missed some)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'CUSTOMER'
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;
