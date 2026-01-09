import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthChange } from './lib/firebase';
import { authApi } from './lib/api';
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
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Sync with backend
                    try {
                        await authApi.sync();
                    } catch (syncError: any) {
                        console.error('Auth Sync Failed:', syncError);
                        throw syncError;
                    }

                    const { data } = await authApi.getMe();
                    setUser(data);
                } catch (error) {
                    console.error('Failed to initialize user session:', error);
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
