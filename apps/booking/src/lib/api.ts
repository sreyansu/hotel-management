import axios from 'axios';
import { getIdToken } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - could redirect to login
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

// API functions
export const hotelsApi = {
    list: (params?: { page?: number; limit?: number; city?: string }) =>
        api.get('/hotels', { params }),

    getById: (id: string) => api.get(`/hotels/${id}`),

    getBySlug: (slug: string) => api.get(`/hotels/slug/${slug}`),

    getRoomTypes: (hotelId: string, checkIn?: string, checkOut?: string) =>
        api.get(`/hotels/${hotelId}/room-types`, {
            params: { check_in_date: checkIn, check_out_date: checkOut },
        }),
};

export const bookingsApi = {
    calculatePrice: (data: {
        hotel_id: string;
        room_type_id: string;
        check_in_date: string;
        check_out_date: string;
        coupon_code?: string;
    }) => api.post('/bookings/calculate-price', data),

    create: (data: {
        hotel_id: string;
        room_type_id: string;
        check_in_date: string;
        check_out_date: string;
        num_guests: number;
        guest_name: string;
        guest_email: string;
        guest_phone: string;
        special_requests?: string;
        coupon_code?: string;
    }) => api.post('/bookings', data),

    getById: (id: string) => api.get(`/bookings/${id}`),

    getByReference: (ref: string) => api.get(`/bookings/reference/${ref}`),

    getMyBookings: (params?: { page?: number; limit?: number }) =>
        api.get('/bookings/my-bookings', { params }),

    createPaymentSession: (bookingId: string) =>
        api.post(`/bookings/${bookingId}/payment-session`),

    getPaymentSession: (sessionId: string) =>
        api.get(`/bookings/payment-session/${sessionId}`),

    cancel: (bookingId: string, reason: string) =>
        api.put(`/bookings/${bookingId}/cancel`, { reason }),
};

export const couponsApi = {
    validate: (data: { code: string; hotel_id: string; booking_amount: number }) =>
        api.post('/coupons/validate', data),
};

export const authApi = {
    register: (data: { email: string; password: string; full_name: string; phone?: string }) =>
        api.post('/auth/register', data),

    sync: () => api.post('/auth/sync'),

    getMe: () => api.get('/auth/me'),

    updateMe: (data: { full_name?: string; phone?: string }) =>
        api.put('/auth/me', data),
};
