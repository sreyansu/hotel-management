import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import { bookingsApi, reportsApi, hotelsApi } from '../lib/api';
import { format } from 'date-fns';
import { CalendarDays, Users, DollarSign, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardHome() {
    const { selectedHotelId } = useAuthStore();

    const { data: arrivalsData } = useQuery({
        queryKey: ['arrivals', selectedHotelId],
        queryFn: () => bookingsApi.getArrivals(selectedHotelId!),
        enabled: !!selectedHotelId,
    });

    const { data: departuresData } = useQuery({
        queryKey: ['departures', selectedHotelId],
        queryFn: () => bookingsApi.getDepartures(selectedHotelId!),
        enabled: !!selectedHotelId,
    });

    const { data: occupancyData } = useQuery({
        queryKey: ['occupancy', selectedHotelId],
        queryFn: () => reportsApi.getOccupancy(selectedHotelId!),
        enabled: !!selectedHotelId,
    });

    const { data: revenueData } = useQuery({
        queryKey: ['revenue', selectedHotelId],
        queryFn: () => reportsApi.getRevenue(selectedHotelId!),
        enabled: !!selectedHotelId,
    });

    const arrivals = arrivalsData?.data || [];
    const departures = departuresData?.data || [];
    const occupancy = occupancyData?.data;
    const revenue = revenueData?.data;

    const stats = [
        {
            label: "Today's Arrivals",
            value: arrivals.length,
            icon: Users,
            color: 'text-blue-600 bg-blue-100',
        },
        {
            label: "Today's Departures",
            value: departures.length,
            icon: Users,
            color: 'text-orange-600 bg-orange-100',
        },
        {
            label: 'Occupancy Rate',
            value: `${occupancy?.average_occupancy || 0}%`,
            icon: TrendingUp,
            color: 'text-green-600 bg-green-100',
        },
        {
            label: 'Monthly Revenue',
            value: `₹${(revenue?.total_revenue || 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-purple-600 bg-purple-100',
        },
    ];

    if (!selectedHotelId) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-500">Please select a hotel to view the dashboard.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Arrivals */}
                <div className="card">
                    <div className="px-5 py-4 border-b flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900">Today's Arrivals</h2>
                        <Link to="/bookings?status=CONFIRMED" className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {arrivals.length === 0 ? (
                            <p className="p-5 text-gray-500 text-center">No arrivals today</p>
                        ) : (
                            arrivals.slice(0, 5).map((booking: any) => (
                                <div key={booking.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <div className="font-medium">{booking.guest_name}</div>
                                        <div className="text-sm text-gray-500">
                                            {booking.room_type?.name} • {booking.num_guests} guest(s)
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-sm">{booking.booking_reference}</div>
                                        <div className="text-xs text-gray-500">{booking.status}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Departures */}
                <div className="card">
                    <div className="px-5 py-4 border-b flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900">Today's Departures</h2>
                        <Link to="/bookings?status=CHECKED_IN" className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {departures.length === 0 ? (
                            <p className="p-5 text-gray-500 text-center">No departures today</p>
                        ) : (
                            departures.slice(0, 5).map((booking: any) => (
                                <div key={booking.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <div className="font-medium">{booking.guest_name}</div>
                                        <div className="text-sm text-gray-500">
                                            Room {booking.room?.room_number} • {booking.room_type?.name}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-sm">{booking.booking_reference}</div>
                                        <Link
                                            to={`/bookings?id=${booking.id}`}
                                            className="text-xs text-primary-600 hover:underline"
                                        >
                                            Check Out
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
