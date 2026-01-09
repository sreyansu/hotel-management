import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User type
interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    roles: Array<{ role: string; hotel_id?: string }>;
}

// Auth store
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setLoading: (isLoading) => set({ isLoading }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user }),
        }
    )
);

// Search/booking state
interface SearchState {
    hotelId?: string;
    checkInDate?: string;
    checkOutDate?: string;
    guests: number;
    roomTypeId?: string;
    setSearch: (search: Partial<SearchState>) => void;
    clearSearch: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
    guests: 2,
    setSearch: (search) => set((state) => ({ ...state, ...search })),
    clearSearch: () => set({ hotelId: undefined, checkInDate: undefined, checkOutDate: undefined, guests: 2, roomTypeId: undefined }),
}));

// Cart/booking in progress
interface BookingState {
    hotelId?: string;
    hotelName?: string;
    roomTypeId?: string;
    roomTypeName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    numGuests: number;
    pricing?: {
        base_price: number;
        nights: number;
        subtotal: number;
        coupon_discount: number;
        taxes: number;
        total_amount: number;
    };
    couponCode?: string;
    guestDetails?: {
        name: string;
        email: string;
        phone: string;
        specialRequests?: string;
    };
    setBooking: (booking: Partial<BookingState>) => void;
    clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()((set) => ({
    numGuests: 2,
    setBooking: (booking) => set((state) => ({ ...state, ...booking })),
    clearBooking: () => set({
        hotelId: undefined,
        hotelName: undefined,
        roomTypeId: undefined,
        roomTypeName: undefined,
        checkInDate: undefined,
        checkOutDate: undefined,
        numGuests: 2,
        pricing: undefined,
        couponCode: undefined,
        guestDetails: undefined,
    }),
}));
