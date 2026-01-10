import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useIsAuthenticated } from '../store';
import { signOut } from '../lib/supabase';
import { Menu, X, User, LogOut, Calendar, Home } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
    const { user, logout } = useAuthStore();
    const isAuthenticated = useIsAuthenticated();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    console.log('Layout Render:', { user, isAuthenticated });

    const handleLogout = async () => {
        await signOut();
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">G</span>
                            </div>
                            <span className="font-display font-bold text-xl text-gray-900">Grand Palace</span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link to="/" className="text-gray-600 hover:text-primary-600 transition">
                                Hotels
                            </Link>
                            {isAuthenticated && (
                                <Link to="/my-bookings" className="text-gray-600 hover:text-primary-600 transition">
                                    My Bookings
                                </Link>
                            )}
                        </nav>

                        {/* Auth buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            {isAuthenticated ? (
                                <div className="flex items-center gap-4">
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                                    >
                                        <User className="w-5 h-5" />
                                        <span>{user?.full_name}</span>
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="btn-ghost text-gray-600"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Link to="/login" className="btn-ghost text-gray-700">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="btn-primary">
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t">
                        <div className="px-4 py-4 space-y-3">
                            <Link
                                to="/"
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Home className="w-5 h-5" />
                                Hotels
                            </Link>
                            {isAuthenticated && (
                                <>
                                    <Link
                                        to="/my-bookings"
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Calendar className="w-5 h-5" />
                                        My Bookings
                                    </Link>
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <User className="w-5 h-5" />
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 w-full text-left"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Logout
                                    </button>
                                </>
                            )}
                            {!isAuthenticated && (
                                <div className="pt-2 border-t flex gap-3">
                                    <Link
                                        to="/login"
                                        className="flex-1 btn-outline text-center"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="flex-1 btn-primary text-center"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Main content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">G</span>
                                </div>
                                <span className="font-display font-bold text-xl text-white">Grand Palace Hotels</span>
                            </div>
                            <p className="text-sm max-w-md">
                                Experience luxury at its finest across India's most beautiful destinations.
                                Book your perfect stay with best price guarantee.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link to="/" className="hover:text-white transition">Hotels</Link></li>
                                <li><Link to="/my-bookings" className="hover:text-white transition">My Bookings</Link></li>
                                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Contact</h4>
                            <ul className="space-y-2 text-sm">
                                <li>1800-123-4567</li>
                                <li>support@grandpalace.com</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
                        © 2026 Grand Palace Hotels. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
