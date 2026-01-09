import axios from 'axios';
import { getIdToken } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
    sync: () => api.post('/auth/sync'),
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
    getHotelStaff: (hotelId: string) => api.get(`/staff/hotel/${hotelId}`),
    create: (hotelId: string, data: any) => api.post(`/staff/hotel/${hotelId}`, data),
    updateRole: (hotelId: string, userId: string, data: { role: string }) =>
        api.put(`/staff/hotel/${hotelId}/user/${userId}`, data),
    remove: (hotelId: string, userId: string) => api.delete(`/staff/hotel/${hotelId}/user/${userId}`),
};

export const reportsApi = {
    getOccupancy: (hotelId: string, params?: any) => api.get(`/reports/hotel/${hotelId}/occupancy`, { params }),
    getRevenue: (hotelId: string, params?: any) => api.get(`/reports/hotel/${hotelId}/revenue`, { params }),
    getBookings: (hotelId: string, params?: any) => api.get(`/reports/hotel/${hotelId}/bookings`, { params }),
};
