import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getMyBookings } from '../lib/queries';
import { useAuthStore, useIsAuthenticated } from '../store';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-success',
    CHECKED_IN: 'badge-primary',
    CHECKED_OUT: 'bg-gray-100 text-gray-800',
    CANCELLED: 'badge-error',
    NO_SHOW: 'badge-error',
};

export default function MyBookingsPage() {
    const { isLoading: authLoading } = useAuthStore();
    const isAuthenticated = useIsAuthenticated();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login?redirect=/my-bookings');
        }
    }, [isAuthenticated, authLoading, navigate]);

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['myBookings'],
        queryFn: getMyBookings,
        enabled: isAuthenticated,
    });

    if (authLoading || isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>

            {bookings.length === 0 ? (
                <div className="text-center py-16">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-medium text-gray-900 mb-2">No Bookings Yet</h2>
                    <p className="text-gray-500 mb-6">You haven't made any reservations yet.</p>
                    <Link to="/" className="btn-primary">Explore Hotels</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking: any) => (
                        <Link
                            key={booking.id}
                            to={`/confirmation/${booking.id}`}
                            className="card p-4 flex items-center gap-4 hover:shadow-lg transition group"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`badge ${STATUS_COLORS[booking.status] || 'badge-primary'}`}>
                                        {booking.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-sm text-gray-500 font-mono">{booking.booking_reference}</span>
                                </div>

                                <h3 className="font-display text-lg font-bold text-gray-900 group-hover:text-primary-600 transition">
                                    {booking.hotels?.name}
                                </h3>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {booking.room_types?.name}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {format(new Date(booking.check_in_date), 'MMM d')} - {format(new Date(booking.check_out_date), 'MMM d, yyyy')}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-lg text-primary-600">
                                    ₹{Number(booking.total_amount).toLocaleString()}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 mt-2 group-hover:text-primary-600 transition" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
