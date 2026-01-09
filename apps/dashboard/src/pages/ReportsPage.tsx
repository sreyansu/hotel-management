import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import { reportsApi } from '../lib/api';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, CalendarDays, Users } from 'lucide-react';

export default function ReportsPage() {
    const { selectedHotelId } = useAuthStore();
    const [dateRange, setDateRange] = useState('30');

    const fromDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
    const toDate = format(new Date(), 'yyyy-MM-dd');

    const { data: occupancyData } = useQuery({
        queryKey: ['report-occupancy', selectedHotelId, fromDate, toDate],
        queryFn: () => reportsApi.getOccupancy(selectedHotelId!, { from_date: fromDate, to_date: toDate }),
        enabled: !!selectedHotelId,
    });

    const { data: revenueData } = useQuery({
        queryKey: ['report-revenue', selectedHotelId, fromDate, toDate],
        queryFn: () => reportsApi.getRevenue(selectedHotelId!, { from_date: fromDate, to_date: toDate }),
        enabled: !!selectedHotelId,
    });

    const { data: bookingsData } = useQuery({
        queryKey: ['report-bookings', selectedHotelId, fromDate, toDate],
        queryFn: () => reportsApi.getBookings(selectedHotelId!, { from_date: fromDate, to_date: toDate }),
        enabled: !!selectedHotelId,
    });

    const occupancy = occupancyData?.data;
    const revenue = revenueData?.data;
    const bookings = bookingsData?.data;

    // Prepare chart data
    const occupancyChartData = Object.entries(occupancy?.daily_occupancy || {}).map(([date, value]) => ({
        date: format(new Date(date), 'MMM d'),
        occupancy: value,
    }));

    const revenueChartData = Object.entries(revenue?.daily_revenue || {}).map(([date, value]) => ({
        date: format(new Date(date), 'MMM d'),
        revenue: value,
    }));

    const stats = [
        { label: 'Avg Occupancy', value: `${occupancy?.average_occupancy || 0}%`, icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
        { label: 'Total Revenue', value: `₹${(revenue?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600 bg-green-100' },
        { label: 'Total Bookings', value: bookings?.total_bookings || 0, icon: CalendarDays, color: 'text-purple-600 bg-purple-100' },
        { label: 'Avg Booking Value', value: `₹${(revenue?.average_booking_value || 0).toLocaleString()}`, icon: Users, color: 'text-orange-600 bg-orange-100' },
    ];

    if (!selectedHotelId) {
        return <div className="text-center py-16 text-gray-500">Please select a hotel.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="input w-40"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Occupancy Chart */}
                <div className="card p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Occupancy Rate (%)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={occupancyChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="occupancy" stroke="#0074d9" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="card p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Daily Revenue (₹)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Booking Status Breakdown */}
            <div className="card p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Booking Status Breakdown</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {Object.entries(bookings?.by_status || {}).map(([status, count]) => (
                        <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                            <div className="text-xs text-gray-500">{status.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
