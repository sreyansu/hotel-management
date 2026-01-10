-- =====================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- This trigger automatically creates a user profile
-- when a new user signs up via Supabase Auth
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    
    -- Assign default CUSTOMER role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'CUSTOMER');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RLS POLICIES FOR DIRECT SDK ACCESS
-- (Idempotent - safe to run multiple times)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can read their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can read their own bookings
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
CREATE POLICY "Users can read own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create bookings for themselves
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
CREATE POLICY "Users can create own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ADMIN POLICIES (for dashboard)
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'HOTEL_ADMIN', 'DUTY_MANAGER')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can read all users
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
    ON public.users FOR SELECT
    USING (public.is_admin());

-- Admins can read all bookings
DROP POLICY IF EXISTS "Admins can read all bookings" ON public.bookings;
CREATE POLICY "Admins can read all bookings"
    ON public.bookings FOR SELECT
    USING (public.is_admin());

-- Admins can update booking status
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
    ON public.bookings FOR UPDATE
    USING (public.is_admin());

-- Admins can manage coupons
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
    ON public.coupons FOR ALL
    USING (public.is_admin());

-- Admins can manage rooms
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.rooms;
CREATE POLICY "Admins can manage rooms"
    ON public.rooms FOR ALL
    USING (public.is_admin());

-- Admins can manage staff roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'SUPER_ADMIN'
        )
    );
