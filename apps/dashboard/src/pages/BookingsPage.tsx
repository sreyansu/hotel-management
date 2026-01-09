import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, hasRole } from '../store';
import { bookingsApi, hotelsApi } from '../lib/api';
import { format } from 'date-fns';
import { Search, Filter, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    CHECKED_IN: 'bg-green-100 text-green-800',
    CHECKED_OUT: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-red-100 text-red-800',
};

export default function BookingsPage() {
    const { selectedHotelId, user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [checkInRoomId, setCheckInRoomId] = useState('');

    const { data: bookingsData, isLoading } = useQuery({
        queryKey: ['bookings', selectedHotelId, statusFilter],
        queryFn: () => bookingsApi.getHotelBookings(selectedHotelId!, { status: statusFilter || undefined }),
        enabled: !!selectedHotelId,
    });

    const { data: roomsData } = useQuery({
        queryKey: ['available-rooms', selectedHotelId, selectedBooking?.room_type_id],
        queryFn: () => hotelsApi.getRooms(selectedHotelId!, { status: 'AVAILABLE', room_type_id: selectedBooking?.room_type_id }),
        enabled: !!selectedHotelId && !!selectedBooking?.room_type_id,
    });

    const checkInMutation = useMutation({
        mutationFn: ({ bookingId, roomId }: { bookingId: string; roomId: string }) =>
            bookingsApi.checkIn(bookingId, roomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            setSelectedBooking(null);
            setCheckInRoomId('');
        },
    });

    const checkOutMutation = useMutation({
        mutationFn: (bookingId: string) => bookingsApi.checkOut(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            setSelectedBooking(null);
        },
    });

    const bookings = bookingsData?.data?.data || [];
    const availableRooms = roomsData?.data || [];

    const filteredBookings = bookings.filter((b: any) =>
        b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.booking_reference?.toLowerCase().includes(search.toLowerCase())
    );

    const canCheckInOut = hasRole(user, 'RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN');

    if (!selectedHotelId) {
        return <div className="text-center py-16 text-gray-500">Please select a hotel.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-gray-900">Bookings</h1>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-9 w-48"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input w-40"
                    >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CHECKED_IN">Checked In</option>
                        <option value="CHECKED_OUT">Checked Out</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>
                            ) : (
                                filteredBookings.map((booking: any) => (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-sm">{booking.booking_reference}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{booking.guest_name}</div>
                                            <div className="text-xs text-gray-500">{booking.guest_email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{booking.room_type?.name}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {format(new Date(booking.check_in_date), 'MMM d')} - {format(new Date(booking.check_out_date), 'MMM d')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${STATUS_COLORS[booking.status] || 'bg-gray-100'}`}>
                                                {booking.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">₹{Number(booking.total_amount).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            {canCheckInOut && booking.status === 'CONFIRMED' && (
                                                <button
                                                    onClick={() => setSelectedBooking({ ...booking, action: 'checkin' })}
                                                    className="btn-success text-sm py-1"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Check In
                                                </button>
                                            )}
                                            {canCheckInOut && booking.status === 'CHECKED_IN' && (
                                                <button
                                                    onClick={() => setSelectedBooking({ ...booking, action: 'checkout' })}
                                                    className="btn-secondary text-sm py-1"
                                                >
                                                    <XCircle className="w-4 h-4" /> Check Out
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Check-in/Check-out Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="font-display text-xl font-bold mb-4">
                            {selectedBooking.action === 'checkin' ? 'Check In Guest' : 'Check Out Guest'}
                        </h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Guest</span>
                                <span className="font-medium">{selectedBooking.guest_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Reference</span>
                                <span className="font-mono">{selectedBooking.booking_reference}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Room Type</span>
                                <span>{selectedBooking.room_type?.name}</span>
                            </div>
                        </div>

                        {selectedBooking.action === 'checkin' && (
                            <div className="mb-6">
                                <label className="label">Assign Room</label>
                                <select
                                    value={checkInRoomId}
                                    onChange={(e) => setCheckInRoomId(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Select a room...</option>
                                    {availableRooms.map((room: any) => (
                                        <option key={room.id} value={room.id}>
                                            Room {room.room_number} - Floor {room.floor}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setSelectedBooking(null)} className="btn-outline flex-1">
                                Cancel
                            </button>
                            {selectedBooking.action === 'checkin' ? (
                                <button
                                    onClick={() => checkInMutation.mutate({ bookingId: selectedBooking.id, roomId: checkInRoomId })}
                                    disabled={!checkInRoomId || checkInMutation.isPending}
                                    className="btn-success flex-1"
                                >
                                    {checkInMutation.isPending ? 'Processing...' : 'Confirm Check In'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => checkOutMutation.mutate(selectedBooking.id)}
                                    disabled={checkOutMutation.isPending}
                                    className="btn-secondary flex-1"
                                >
                                    {checkOutMutation.isPending ? 'Processing...' : 'Confirm Check Out'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
