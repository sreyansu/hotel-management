import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, hasRole } from '../store';
import { couponsApi } from '../lib/api';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

export default function CouponsPage() {
    const { selectedHotelId, user } = useAuthStore();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: '',
        min_booking_amount: '',
        max_uses: '',
        valid_from: '',
        valid_until: '',
    });

    const { data: couponsData, isLoading } = useQuery({
        queryKey: ['coupons', selectedHotelId],
        queryFn: () => couponsApi.getHotelCoupons(selectedHotelId!),
        enabled: !!selectedHotelId,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => couponsApi.create({ ...data, hotel_id: selectedHotelId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => couponsApi.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
    });

    const coupons = couponsData?.data || [];
    const canManage = hasRole(user, 'HOTEL_ADMIN', 'DUTY_MANAGER');

    const resetForm = () => {
        setShowForm(false);
        setEditingCoupon(null);
        setFormData({
            code: '', description: '', discount_type: 'PERCENTAGE', discount_value: '',
            min_booking_amount: '', max_uses: '', valid_from: '', valid_until: '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            code: formData.code.toUpperCase(),
            description: formData.description,
            discount_type: formData.discount_type,
            discount_value: Number(formData.discount_value),
            min_booking_amount: formData.min_booking_amount ? Number(formData.min_booking_amount) : undefined,
            max_uses: formData.max_uses ? Number(formData.max_uses) : undefined,
            valid_from: formData.valid_from || undefined,
            valid_until: formData.valid_until || undefined,
        });
    };

    if (!selectedHotelId) {
        return <div className="text-center py-16 text-gray-500">Please select a hotel.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="font-display text-2xl font-bold text-gray-900">Coupons</h1>
                {canManage && (
                    <button onClick={() => setShowForm(true)} className="btn-primary">
                        <Plus className="w-4 h-4" /> Add Coupon
                    </button>
                )}
            </div>

            {/* Coupons Grid */}
            {isLoading ? (
                <div className="text-center py-16 text-gray-500">Loading...</div>
            ) : coupons.length === 0 ? (
                <div className="text-center py-16">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No coupons yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map((coupon: any) => (
                        <div key={coupon.id} className="card p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-mono text-lg font-bold text-primary-600">{coupon.code}</div>
                                <span className={`badge ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {coupon.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
                            <div className="text-2xl font-bold mb-3">
                                {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                                <span className="text-sm font-normal text-gray-500"> off</span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-500">
                                {coupon.min_booking_amount && (
                                    <div>Min booking: ₹{Number(coupon.min_booking_amount).toLocaleString()}</div>
                                )}
                                {coupon.valid_until && (
                                    <div>Valid until: {format(new Date(coupon.valid_until), 'MMM d, yyyy')}</div>
                                )}
                                <div>Used: {coupon.current_uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</div>
                            </div>
                            {canManage && (
                                <div className="flex gap-2 mt-4 pt-3 border-t">
                                    <button
                                        onClick={() => deleteMutation.mutate(coupon.id)}
                                        className="btn-outline text-red-600 hover:bg-red-50 flex-1 py-1.5"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="font-display text-xl font-bold mb-6">
                            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="input uppercase"
                                        placeholder="SUMMER2026"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Discount Type</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                        className="input"
                                    >
                                        <option value="PERCENTAGE">Percentage</option>
                                        <option value="FIXED">Fixed Amount</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    placeholder="Summer special discount"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Discount Value</label>
                                    <input
                                        type="number"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="input"
                                        placeholder={formData.discount_type === 'PERCENTAGE' ? '10' : '500'}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Min Booking Amount</label>
                                    <input
                                        type="number"
                                        value={formData.min_booking_amount}
                                        onChange={(e) => setFormData({ ...formData, min_booking_amount: e.target.value })}
                                        className="input"
                                        placeholder="5000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Valid From</label>
                                    <input
                                        type="date"
                                        value={formData.valid_from}
                                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Valid Until</label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Max Uses</label>
                                <input
                                    type="number"
                                    value={formData.max_uses}
                                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                    className="input"
                                    placeholder="Unlimited if empty"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={resetForm} className="btn-outline flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                                    {createMutation.isPending ? 'Saving...' : 'Save Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
