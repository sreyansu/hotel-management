import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API functions
export const authApi = {
    sync: () => api.post('/auth/sync', {}),
    getMe: () => api.get('/auth/me'),
};

export const hotelsApi = {
    list: () => api.get('/hotels'),
    getById: (id: string) => api.get(`/hotels/${id}`),
    getRooms: (hotelId: string, params?: any) => api.get(`/hotels/${hotelId}/rooms`, { params }),
    updateRoomStatus: (hotelId: string, roomId: string, data: { status: string; notes?: string }) =>
        api.put(`/hotels/${hotelId}/rooms/${roomId}/status`, data),
    getRoomTypes: (hotelId: string) => api.get(`/hotels/${hotelId}/room-types`),
};

export const bookingsApi = {
    getHotelBookings: (hotelId: string, params?: any) => api.get(`/bookings/hotel/${hotelId}`, { params }),
    getArrivals: (hotelId: string) => api.get(`/bookings/hotel/${hotelId}/arrivals`),
    getDepartures: (hotelId: string) => api.get(`/bookings/hotel/${hotelId}/departures`),
    getById: (id: string) => api.get(`/bookings/${id}`),
    checkIn: (id: string, roomId: string) => api.put(`/bookings/${id}/check-in`, { room_id: roomId }),
    checkOut: (id: string) => api.put(`/bookings/${id}/check-out`),
    createPaymentSession: (id: string) => api.post(`/bookings/${id}/payment-session`),
    verifyPayment: (sessionId: string, data: { transaction_id: string; payment_method: string }) =>
        api.post(`/bookings/payment-session/${sessionId}/verify`, data),
};

export const couponsApi = {
    getHotelCoupons: (hotelId: string) => api.get(`/coupons/hotel/${hotelId}`),
    create: (data: any) => api.post('/coupons', data),
    update: (id: string, data: any) => api.put(`/coupons/${id}`, data),
    delete: (id: string) => api.delete(`/coupons/${id}`),
};

export const pricingApi = {
    getConfig: (hotelId: string) => api.get(`/pricing/${hotelId}/config`),
    getOccupancy: (hotelId: string) => api.get(`/pricing/${hotelId}/occupancy`),
    updateSeasonal: (hotelId: string, data: any) => api.put(`/pricing/${hotelId}/seasonal`, data),
    updateOccupancy: (hotelId: string, data: any) => api.put(`/pricing/${hotelId}/occupancy`, data),
};

export const staffApi = {
    getHotelStaff: async (hotelId: string) => {
        const { data, error } = await supabase
            .from('user_roles')
            .select('user:users(*), role')
            .eq('hotel_id', hotelId);

        if (error) throw error;

        // Transform to match expected format
        const staff = data.map((item: any) => ({
            user: item.user,
            roles: [item.role],
        }));

        return { data: staff };
    },

    // Use adminApi for creation
    create: (hotelId: string, data: any) => adminApi.createUser({ ...data, hotel_id: hotelId }),

    updateRole: async (hotelId: string, userId: string, data: { role: string }) => {
        // First remove old role for this hotel
        await supabase.from('user_roles').delete().match({ user_id: userId, hotel_id: hotelId });
        // Add new role
        return supabase.from('user_roles').insert({ user_id: userId, hotel_id: hotelId, role: data.role });
    },

    remove: (hotelId: string, userId: string) =>
        supabase.from('user_roles').delete().match({ user_id: userId, hotel_id: hotelId }),
};

export const reportsApi = {
    getOccupancy: (hotelId: string, params?: any) => api.get(`/reports/hotel/${hotelId}/occupancy`, { params }),
    getRevenue: (hotelId: string, params?: any) => api.get(`/reports/hotel/${hotelId}/revenue`, { params }),
    getBookings: (hotelId: string, params?: any) => api.get(`/reports/hotel/${hotelId}/bookings`, { params }),
};

export const adminApi = {
    setup: () => api.post('/admin/setup', {}),

    getUsers: async (params?: { page?: number; limit?: number }) => {
        const { data, error, count } = await supabase
            .from('users')
            .select('*, user_roles(*)', { count: 'exact' })
            .range(
                ((params?.page || 1) - 1) * (params?.limit || 10),
                (params?.page || 1) * (params?.limit || 10) - 1
            );
        if (error) throw error;
        return { data: { data, pagination: { total: count } } };
    },

    createUser: async (data: {
        email: string;
        password: string;
        full_name: string;
        role: string;
        hotel_id?: string;
        phone?: string;
    }) => {
        const { data: session } = await supabase.auth.getSession();
        return axios.post(`${API_BASE_URL}/create-user`,
            {
                email: data.email,
                password: data.password,
                fullName: data.full_name,
                role: data.role,
                hotelIds: data.hotel_id ? [data.hotel_id] : [],
                phone: data.phone
            },
            {
                headers: {
                    Authorization: `Bearer ${session.session?.access_token}`
                }
            }
        );
    },

    assignRole: async (userId: string, data: { role: string; hotel_id?: string }) => {
        const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: data.role, hotel_id: data.hotel_id });
        if (error) throw error;
        return { data: { success: true } };
    },

    removeRole: async (userId: string, role: string) => {
        const { error } = await supabase
            .from('user_roles')
            .delete()
            .match({ user_id: userId, role });
        if (error) throw error;
        return { data: { success: true } };
    },
};
