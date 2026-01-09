import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, hasRole } from '../store';
import { hotelsApi } from '../lib/api';
import { BedDouble, RefreshCw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
    OCCUPIED: 'bg-blue-100 text-blue-800 border-blue-200',
    CLEANING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    MAINTENANCE: 'bg-red-100 text-red-800 border-red-200',
    OUT_OF_ORDER: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function RoomsPage() {
    const { selectedHotelId, user } = useAuthStore();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [newStatus, setNewStatus] = useState('');
    const [notes, setNotes] = useState('');

    const { data: roomsData, isLoading } = useQuery({
        queryKey: ['rooms', selectedHotelId, statusFilter],
        queryFn: () => hotelsApi.getRooms(selectedHotelId!, { status: statusFilter || undefined }),
        enabled: !!selectedHotelId,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ roomId, status, notes }: { roomId: string; status: string; notes?: string }) =>
            hotelsApi.updateRoomStatus(selectedHotelId!, roomId, { status, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setSelectedRoom(null);
            setNewStatus('');
            setNotes('');
        },
    });

    const rooms = roomsData?.data || [];
    const canUpdateStatus = hasRole(user, 'HOUSEKEEPING', 'RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN');

    // Group rooms by floor
    const roomsByFloor = rooms.reduce((acc: Record<string, any[]>, room: any) => {
        const floor = room.floor || 'Unknown';
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(room);
        return acc;
    }, {});

    if (!selectedHotelId) {
        return <div className="text-center py-16 text-gray-500">Please select a hotel.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-gray-900">Rooms</h1>
                <div className="flex gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input w-40"
                    >
                        <option value="">All Status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="OCCUPIED">Occupied</option>
                        <option value="CLEANING">Cleaning</option>
                        <option value="MAINTENANCE">Maintenance</option>
                    </select>
                </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.split(' ')[0]}`}></div>
                        <span className="text-sm text-gray-600">{status.replace('_', ' ')}</span>
                    </div>
                ))}
            </div>

            {/* Rooms Grid by Floor */}
            {isLoading ? (
                <div className="text-center py-16 text-gray-500">Loading rooms...</div>
            ) : Object.keys(roomsByFloor).length === 0 ? (
                <div className="text-center py-16 text-gray-500">No rooms found</div>
            ) : (
                Object.entries(roomsByFloor)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([floor, floorRooms]) => (
                        <div key={floor} className="card p-4">
                            <h2 className="font-semibold text-gray-700 mb-4">Floor {floor}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {(floorRooms as any[]).map((room) => (
                                    <button
                                        key={room.id}
                                        onClick={() => canUpdateStatus && setSelectedRoom(room)}
                                        disabled={!canUpdateStatus}
                                        className={`p-4 rounded-lg border-2 text-center transition hover:shadow-md ${STATUS_COLORS[room.status] || 'bg-gray-50 border-gray-200'
                                            } ${canUpdateStatus ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <BedDouble className="w-6 h-6 mx-auto mb-1" />
                                        <div className="font-bold text-lg">{room.room_number}</div>
                                        <div className="text-xs truncate">{room.room_type?.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
            )}

            {/* Update Status Modal */}
            {selectedRoom && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="font-display text-xl font-bold mb-4">
                            Update Room {selectedRoom.room_number}
                        </h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Current Status</span>
                                <span className={`badge ${STATUS_COLORS[selectedRoom.status]}`}>
                                    {selectedRoom.status}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Room Type</span>
                                <span>{selectedRoom.room_type?.name}</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="label">New Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Select status...</option>
                                    <option value="AVAILABLE">Available</option>
                                    <option value="CLEANING">Cleaning</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="OUT_OF_ORDER">Out of Order</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Notes (Optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="input min-h-[80px]"
                                    placeholder="Add notes..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSelectedRoom(null)} className="btn-outline flex-1">
                                Cancel
                            </button>
                            <button
                                onClick={() => updateStatusMutation.mutate({ roomId: selectedRoom.id, status: newStatus, notes: notes || undefined })}
                                disabled={!newStatus || updateStatusMutation.isPending}
                                className="btn-primary flex-1"
                            >
                                {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
