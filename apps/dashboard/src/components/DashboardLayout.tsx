import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, hasRole } from '../store';
import { signOut } from '../lib/supabase';
import { hotelsApi } from '../lib/api';
import {
    LayoutDashboard,
    CalendarDays,
    BedDouble,
    Tag,
    Users,
    BarChart3,
    LogOut,
    Menu,
    X,
    Building2,
    ChevronDown,
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTS'] },
    { name: 'Bookings', href: '/bookings', icon: CalendarDays, roles: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION'] },
    { name: 'Rooms', href: '/rooms', icon: BedDouble, roles: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING'] },
    { name: 'Coupons', href: '/coupons', icon: Tag, roles: ['HOTEL_ADMIN', 'DUTY_MANAGER'] },
    { name: 'Staff', href: '/staff', icon: Users, roles: ['HOTEL_ADMIN'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'ACCOUNTS'] },
];

export default function DashboardLayout() {
    const { user, selectedHotelId, setSelectedHotel, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { data: hotelsData } = useQuery({
        queryKey: ['hotels'],
        queryFn: () => hotelsApi.list(),
    });

    const hotels = hotelsData?.data?.data || [];
    const selectedHotel = hotels.find((h: any) => h.id === selectedHotelId);

    // Filter navigation based on user role
    const filteredNav = navigation.filter((item) =>
        user?.highest_role === 'SUPER_ADMIN' || item.roles.includes(user?.highest_role || '')
    );

    const handleLogout = async () => {
        await signOut();
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-white border-r z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-2 h-16 px-4 border-b">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">G</span>
                        </div>
                        <div>
                            <div className="font-display font-bold text-gray-900">Grand Palace</div>
                            <div className="text-xs text-gray-500">Management</div>
                        </div>
                        <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Hotel Selector */}
                    {hotels.length > 0 && (user?.highest_role === 'SUPER_ADMIN' || user?.hotel_ids?.length! > 1) && (
                        <div className="p-4 border-b">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Select Hotel</label>
                            <select
                                value={selectedHotelId || ''}
                                onChange={(e) => setSelectedHotel(e.target.value)}
                                className="input text-sm"
                            >
                                {hotels.filter((h: any) =>
                                    user?.highest_role === 'SUPER_ADMIN' || user?.hotel_ids?.includes(h.id)
                                ).map((hotel: any) => (
                                    <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {filteredNav.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-700 font-medium">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{user?.full_name}</div>
                                <div className="text-xs text-gray-500">{user?.highest_role.replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64">
                {/* Top header */}
                <header className="bg-white border-b h-16 flex items-center px-4 sticky top-0 z-30">
                    <button
                        className="lg:hidden p-2 -ml-2"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {selectedHotel && (
                        <div className="flex items-center gap-2 ml-4 lg:ml-0">
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <span className="font-medium">{selectedHotel.name}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{selectedHotel.city}</span>
                        </div>
                    )}
                </header>

                {/* Page content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
