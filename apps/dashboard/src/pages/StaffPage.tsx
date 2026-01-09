import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, hasRole } from '../store';
import { staffApi } from '../lib/api';
import { Plus, Trash2, Users } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
    HOTEL_ADMIN: 'Hotel Admin',
    DUTY_MANAGER: 'Duty Manager',
    RECEPTION: 'Receptionist',
    HOUSEKEEPING: 'Housekeeping',
    ACCOUNTS: 'Accounts',
};

export default function StaffPage() {
    const { selectedHotelId, user } = useAuthStore();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        email: '', password: '', full_name: '', phone: '', role: 'RECEPTION',
    });

    const { data: staffData, isLoading } = useQuery({
        queryKey: ['staff', selectedHotelId],
        queryFn: () => staffApi.getHotelStaff(selectedHotelId!),
        enabled: !!selectedHotelId,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => staffApi.create(selectedHotelId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            resetForm();
        },
    });

    const removeMutation = useMutation({
        mutationFn: (userId: string) => staffApi.remove(selectedHotelId!, userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
    });

    const staff = staffData?.data || [];
    const canManage = hasRole(user, 'HOTEL_ADMIN');

    const resetForm = () => {
        setShowForm(false);
        setFormData({ email: '', password: '', full_name: '', phone: '', role: 'RECEPTION' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    if (!selectedHotelId) {
        return <div className="text-center py-16 text-gray-500">Please select a hotel.</div>;
    }

    if (!canManage) {
        return <div className="text-center py-16 text-gray-500">You don't have permission to manage staff.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="font-display text-2xl font-bold text-gray-900">Staff Management</h1>
                <button onClick={() => setShowForm(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Add Staff
                </button>
            </div>

            {/* Staff Table */}
            <div className="card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : staff.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No staff members</td></tr>
                        ) : (
                            staff.map((member: any) => (
                                <tr key={member.user?.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{member.user?.full_name}</td>
                                    <td className="px-4 py-3 text-sm">{member.user?.email}</td>
                                    <td className="px-4 py-3 text-sm">{member.user?.phone || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="badge bg-primary-100 text-primary-800">
                                            {member.roles?.map((r: string) => ROLE_LABELS[r] || r).join(', ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`badge ${member.user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {member.user?.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => removeMutation.mutate(member.user?.id)}
                                            disabled={removeMutation.isPending}
                                            className="btn-danger py-1 text-sm"
                                        >
                                            <Trash2 className="w-4 h-4" /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Staff Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="font-display text-xl font-bold mb-6">Add Staff Member</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="label">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="input"
                                >
                                    <option value="DUTY_MANAGER">Duty Manager</option>
                                    <option value="RECEPTION">Receptionist</option>
                                    <option value="HOUSEKEEPING">Housekeeping</option>
                                    <option value="ACCOUNTS">Accounts</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={resetForm} className="btn-outline flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                                    {createMutation.isPending ? 'Adding...' : 'Add Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
