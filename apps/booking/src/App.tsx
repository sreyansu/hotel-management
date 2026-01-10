import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthChange, supabase } from './lib/supabase';
import { useAuthStore } from './store';

// Layout
import Layout from './components/Layout';

// Pages
import HomePage from './pages/HomePage';
import HotelPage from './pages/HotelPage';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import ConfirmationPage from './pages/ConfirmationPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading } = useAuthStore();

    useEffect(() => {
        // Check initial session on app load
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await loadUserProfile(session.user.id, session.user);
            } else {
                setLoading(false);
            }
        };

        // Load user profile from database
        const loadUserProfile = async (userId: string, supabaseUser: any) => {
            try {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*, user_roles(*)')
                    .eq('id', userId)
                    .single();

                if (error || !profile) {
                    // User doesn't have a profile yet - create one
                    const { data: newProfile } = await supabase
                        .from('users')
                        .insert({
                            id: userId,
                            email: supabaseUser.email || '',
                            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
                        })
                        .select('*, user_roles(*)')
                        .single();

                    if (newProfile) {
                        // Also create customer role
                        await supabase.from('user_roles').insert({ user_id: userId, role: 'CUSTOMER' }).select();
                        setUser({ ...newProfile, roles: [{ role: 'CUSTOMER' }] });
                    }
                } else {
                    setUser({
                        ...profile,
                        roles: profile.user_roles || [],
                    });
                }
            } catch (error) {
                console.error('Failed to load user profile:', error);
                setUser(null);
            }
            setLoading(false);
        };

        // Check session on load
        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);
                if (event === 'SIGNED_IN' && session?.user) {
                    await loadUserProfile(session.user.id, session.user);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [setUser, setLoading]);

    return <>{children}</>;
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/hotels/:slug" element={<HotelPage />} />
                            <Route path="/booking" element={<BookingPage />} />
                            <Route path="/payment/:bookingId" element={<PaymentPage />} />
                            <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
                            <Route path="/my-bookings" element={<MyBookingsPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                        </Route>
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
