import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'SUPER_ADMIN' | 'HOTEL_ADMIN' | 'DUTY_MANAGER' | 'RECEPTION' | 'HOUSEKEEPING' | 'ACCOUNTS';

interface RoleAssignment {
    role: UserRole;
    hotel_id?: string;
}

interface User {
    id: string;
    email: string;
    full_name: string;
    roles: RoleAssignment[];
    highest_role: UserRole;
    hotel_ids: string[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    selectedHotelId: string | null;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setSelectedHotel: (hotelId: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            selectedHotelId: null,
            setUser: (user) => {
                set({
                    user,
                    isAuthenticated: !!user,
                    selectedHotelId: user?.hotel_ids?.[0] || null,
                });
            },
            setLoading: (isLoading) => set({ isLoading }),
            setSelectedHotel: (selectedHotelId) => set({ selectedHotelId }),
            logout: () => set({ user: null, isAuthenticated: false, selectedHotelId: null }),
        }),
        {
            name: 'dashboard-auth',
            partialize: (state) => ({ user: state.user, selectedHotelId: state.selectedHotelId }),
        }
    )
);

// Permission helpers
export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
    if (!user) return false;
    if (user.highest_role === 'SUPER_ADMIN') return true;
    return roles.includes(user.highest_role);
}

export function canAccessHotel(user: User | null, hotelId: string): boolean {
    if (!user) return false;
    if (user.highest_role === 'SUPER_ADMIN') return true;
    return user.hotel_ids.includes(hotelId);
}
