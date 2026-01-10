import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthChange, supabase } from './lib/supabase';
import { useAuthStore, hasRole } from './store';

// Layout
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';

// Pages
import DashboardHome from './pages/DashboardHome';
import BookingsPage from './pages/BookingsPage';
import RoomsPage from './pages/RoomsPage';
import CouponsPage from './pages/CouponsPage';
import StaffPage from './pages/StaffPage';
import ReportsPage from './pages/ReportsPage';

const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading, user } = useAuthStore();

    useEffect(() => {
        const unsubscribe = onAuthChange(async (supabaseUser) => {
            if (supabaseUser) {
                try {
                    // Get user profile with roles from database
                    const { data: profile, error } = await supabase
                        .from('users')
                        .select('*, user_roles(*)')
                        .eq('id', supabaseUser.id)
                        .single();

                    if (error || !profile) {
                        console.error('Failed to load profile:', error);
                        setUser(null);
                        setLoading(false);
                        return;
                    }

                    // Check if user has staff role
                    const staffRoles = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTS'];
                    const userRoles = profile.user_roles || [];

                    if (userRoles.some((r: any) => staffRoles.includes(r.role))) {
                        // Calculate highest role
                        const rolePriority = {
                            'SUPER_ADMIN': 6,
                            'HOTEL_ADMIN': 5,
                            'DUTY_MANAGER': 4,
                            'ACCOUNTS': 3,
                            'RECEPTION': 2,
                            'HOUSEKEEPING': 1,
                            'CUSTOMER': 0
                        };

                        const highestRole = userRoles.reduce((prev: any, curr: any) => {
                            if (!prev) return curr.role;
                            const prevP = rolePriority[prev as keyof typeof rolePriority] || 0;
                            const currP = rolePriority[curr.role as keyof typeof rolePriority] || 0;
                            return currP > prevP ? curr.role : prev;
                        }, '') as string;

                        // Calculate hotel IDs
                        const hotelIds = userRoles
                            .map((r: any) => r.hotel_id)
                            .filter((id: any) => !!id);

                        setUser({
                            ...profile,
                            roles: userRoles,
                            highest_role: highestRole,
                            hotel_ids: hotelIds
                        });
                    } else {
                        setUser(null); // Customer - not allowed in dashboard
                    }
                } catch (error) {
                    console.error('Auth failed:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, [setUser, setLoading]);

    return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<DashboardHome />} />
                            <Route path="/bookings" element={<BookingsPage />} />
                            <Route path="/rooms" element={<RoomsPage />} />
                            <Route path="/coupons" element={<CouponsPage />} />
                            <Route path="/staff" element={<StaffPage />} />
                            <Route path="/reports" element={<ReportsPage />} />
                        </Route>
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
