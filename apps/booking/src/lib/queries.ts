import { supabase } from './supabase';

// Types
export interface Hotel {
    id: string;
    name: string;
    slug: string;
    description: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    phone: string;
    email: string;
    star_rating: number;
    check_in_time: string;
    check_out_time: string;
    cover_image_url: string;
    is_active: boolean;
}

export interface RoomType {
    id: string;
    hotel_id: string;
    name: string;
    description: string;
    base_price: number;
    max_occupancy: number;
    bed_type: string;
    room_size_sqft: number;
    image_url: string;
    is_active: boolean;
}

export interface Amenity {
    id: string;
    name: string;
    icon: string;
    category: string;
}

export interface Booking {
    id: string;
    booking_reference: string;
    hotel_id: string;
    user_id: string;
    room_type_id: string;
    check_in_date: string;
    check_out_date: string;
    num_guests: number;
    status: string;
    total_amount: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests: string;
    created_at: string;
    hotels?: Hotel;
    room_types?: RoomType;
}

// =====================================================
// HOTEL QUERIES
// =====================================================

export async function getHotels() {
    const { data, error } = await supabase
        .from('hotels')
        .select(`
            *,
            hotel_amenities (
                amenities (*)
            )
        `)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;

    return data?.map(hotel => ({
        ...hotel,
        amenities: hotel.hotel_amenities?.map((ha: any) => ha.amenities) || [],
    })) || [];
}

export async function getHotelBySlug(slug: string) {
    const { data, error } = await supabase
        .from('hotels')
        .select(`
            *,
            hotel_amenities (
                amenities (*)
            ),
            hotel_images (*)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

    if (error) throw error;

    return {
        ...data,
        amenities: data.hotel_amenities?.map((ha: any) => ha.amenities) || [],
        images: data.hotel_images || [],
    };
}

export async function getHotelRoomTypes(hotelId: string) {
    const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('hotel_id', hotelId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('base_price');

    if (error) throw error;
    return data || [];
}

// =====================================================
// BOOKING QUERIES
// =====================================================

export async function getMyBookings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            hotels (*),
            room_types (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getBookingById(bookingId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            hotels (*),
            room_types (*),
            payments (*)
        `)
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();

    if (error) throw error;
    return data;
}

// =====================================================
// USER PROFILE QUERIES
// =====================================================

export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('users')
        .select('*, user_roles(*)')
        .eq('id', user.id)
        .single();

    if (error) throw error;
    return data;
}

export async function updateUserProfile(updates: { full_name?: string; phone?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =====================================================
// AVAILABILITY CHECK
// =====================================================

export async function checkRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string
) {
    // Count rooms of this type
    const { count: totalRooms, error: countError } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('room_type_id', roomTypeId)
        .eq('is_active', true);

    if (countError) throw countError;

    // Count overlapping bookings
    const { count: bookedRooms, error: bookingError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('room_type_id', roomTypeId)
        .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
        .or(`check_in_date.lt.${checkOutDate},check_out_date.gt.${checkInDate}`);

    if (bookingError) throw bookingError;

    const available = (totalRooms || 0) - (bookedRooms || 0);
    return {
        available: available > 0,
        roomsAvailable: Math.max(0, available),
        totalRooms: totalRooms || 0,
    };
}

// =====================================================
// COUPON QUERIES  
// =====================================================

export async function validateCoupon(code: string, hotelId?: string) {
    const now = new Date().toISOString();

    let query = supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now);

    // Check if coupon is global or for specific hotel
    if (hotelId) {
        query = query.or(`hotel_id.is.null,hotel_id.eq.${hotelId}`);
    } else {
        query = query.is('hotel_id', null);
    }

    const { data, error } = await query.single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error('Invalid or expired coupon code');
        }
        throw error;
    }

    // Check usage limit
    if (data.usage_limit && data.used_count >= data.usage_limit) {
        throw new Error('Coupon usage limit reached');
    }

    return data;
}

// =====================================================
// EDGE FUNCTION CALLS (for complex operations)
// =====================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface CreateBookingRequest {
    hotel_id: string;
    room_type_id: string;
    check_in_date: string;
    check_out_date: string;
    num_guests: number;
    guest_name: string;
    guest_email: string;
    guest_phone?: string;
    special_requests?: string;
    coupon_code?: string;
}

export async function createBooking(data: CreateBookingRequest) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-booking`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
    }
    return result.booking;
}

export interface ProcessPaymentRequest {
    booking_id: string;
    payment_method: 'UPI' | 'CARD' | 'NET_BANKING';
    upi_id?: string;
}

export async function processPayment(data: ProcessPaymentRequest) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to process payment');
    }
    return result;
}

// =====================================================
// RAZORPAY PAYMENTS
// =====================================================

export async function createRazorpayOrder(bookingId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-create-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment order');
    }
    return result;
}

export interface VerifyRazorpayPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    booking_id: string;
}

export async function verifyRazorpayPayment(data: VerifyRazorpayPaymentRequest) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Payment verification failed');
    }
    return result;
}
