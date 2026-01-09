import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import { authApi } from '../lib/api';
import { User, Mail, Phone, Save } from 'lucide-react';

export default function ProfilePage() {
    const { user, isAuthenticated, isLoading: authLoading, setUser } = useAuthStore();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState(user?.full_name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login?redirect=/profile');
        }
    }, [isAuthenticated, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name);
            setPhone(user.phone || '');
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: (data: { full_name?: string; phone?: string }) => authApi.updateMe(data),
        onSuccess: (response) => {
            setUser({ ...user!, ...response.data });
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate({ full_name: fullName, phone: phone || undefined });
    };

    if (authLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

            <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                {/* Avatar placeholder */}
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-10 h-10 text-primary-600" />
                    </div>
                    <div>
                        <div className="font-medium text-lg">{user?.full_name}</div>
                        <div className="text-gray-500">{user?.email}</div>
                    </div>
                </div>

                <div className="pt-6 border-t space-y-4">
                    <div>
                        <label className="label">
                            <User className="w-4 h-4 inline mr-1" />
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="input bg-gray-50 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                        <label className="label">
                            <Phone className="w-4 h-4 inline mr-1" />
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="input"
                            placeholder="+91 98765 43210"
                        />
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                        {successMessage}
                    </div>
                )}

                {updateMutation.isError && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                        Failed to update profile. Please try again.
                    </div>
                )}

                <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary w-full py-3"
                >
                    <Save className="w-5 h-5" />
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            {/* Account info */}
            <div className="card p-6 mt-6">
                <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Account Information</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Member Since</span>
                        <span>January 2026</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Account Status</span>
                        <span className="text-green-600 font-medium">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
