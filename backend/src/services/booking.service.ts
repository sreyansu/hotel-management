import { supabase } from '../config/database.js';
import {
    Booking,
    BookingWithDetails,
    BookingStatus,
    CreateBookingRequest,
    PaginatedResponse,
    PaginationParams,
} from '../types/index.js';
import { pricingService } from './pricing.service.js';
import { couponService } from './coupon.service.js';

/**
 * Booking Management Service
 */

export class BookingService {
    /**
     * Create a new booking
     */
    async createBooking(
        request: CreateBookingRequest,
        userId: string
    ): Promise<Booking> {
        const checkInDate = new Date(request.check_in_date);
        const checkOutDate = new Date(request.check_out_date);

        // Validate dates
        if (checkOutDate <= checkInDate) {
            throw new Error('Check-out date must be after check-in date');
        }

        if (checkInDate < new Date()) {
            throw new Error('Check-in date cannot be in the past');
        }

        // Check room availability
        const available = await this.checkAvailability(
            request.hotel_id,
            request.room_type_id,
            request.check_in_date,
            request.check_out_date
        );

        if (!available) {
            throw new Error('No rooms available for the selected dates');
        }

        // Calculate pricing
        let couponDiscount = 0;
        let couponId: string | undefined;

        if (request.coupon_code) {
            const result = await couponService.validateCoupon(
                request.coupon_code,
                request.hotel_id,
                0, // Will calculate after getting subtotal
                userId
            );

            if (result.valid && result.coupon) {
                // Calculate price to get subtotal first
                const tempPrice = await pricingService.calculatePrice(
                    request.hotel_id,
                    request.room_type_id,
                    checkInDate,
                    checkOutDate,
                    0
                );

                // Re-validate with actual booking amount
                const finalResult = await couponService.validateCoupon(
                    request.coupon_code,
                    request.hotel_id,
                    tempPrice.subtotal,
                    userId
                );

                if (finalResult.valid && finalResult.discount_amount) {
                    couponDiscount = finalResult.discount_amount;
                    couponId = finalResult.coupon?.id;
                }
            }
        }

        const pricing = await pricingService.calculatePrice(
            request.hotel_id,
            request.room_type_id,
            checkInDate,
            checkOutDate,
            couponDiscount
        );

        // Create booking
        const bookingData = {
            hotel_id: request.hotel_id,
            user_id: userId,
            room_type_id: request.room_type_id,
            check_in_date: request.check_in_date,
            check_out_date: request.check_out_date,
            num_guests: request.num_guests,
            status: 'PENDING' as BookingStatus,
            base_price: pricing.base_price,
            seasonal_multiplier: pricing.seasonal_multiplier,
            day_type_multiplier: pricing.day_type_multiplier,
            occupancy_multiplier: pricing.occupancy_multiplier,
            subtotal: pricing.subtotal,
            coupon_id: couponId,
            coupon_discount: couponDiscount,
            taxes: pricing.taxes,
            total_amount: pricing.total_amount,
            guest_name: request.guest_name,
            guest_email: request.guest_email,
            guest_phone: request.guest_phone,
            special_requests: request.special_requests,
        };

        const { data: booking, error } = await supabase
            .from('bookings')
            .insert(bookingData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create booking: ${error.message}`);
        }

        // Record coupon usage if applicable
        if (couponId && couponDiscount > 0) {
            await couponService.recordUsage(couponId, userId, booking.id, couponDiscount);
        }

        // Add additional guests
        if (request.additional_guests && request.additional_guests.length > 0) {
            await supabase
                .from('booking_guests')
                .insert(
                    request.additional_guests.map((guest) => ({
                        ...guest,
                        booking_id: booking.id,
                    }))
                );
        }

        return booking as Booking;
    }

    /**
     * Check room availability for a date range
     */
    async checkAvailability(
        hotelId: string,
        roomTypeId: string,
        checkInDate: string,
        checkOutDate: string
    ): Promise<boolean> {
        // Get total rooms of this type
        const { count: totalRooms } = await supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .eq('room_type_id', roomTypeId)
            .eq('is_active', true)
            .is('deleted_at', null);

        if (!totalRooms || totalRooms === 0) {
            return false;
        }

        // Get booked rooms for overlapping dates
        const { count: bookedRooms } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .eq('room_type_id', roomTypeId)
            .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
            .lt('check_in_date', checkOutDate)
            .gt('check_out_date', checkInDate);

        return (bookedRooms || 0) < totalRooms;
    }

    /**
     * Get available room count for a date range
     */
    async getAvailableRoomCount(
        hotelId: string,
        roomTypeId: string,
        checkInDate: string,
        checkOutDate: string
    ): Promise<number> {
        const { count: totalRooms } = await supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .eq('room_type_id', roomTypeId)
            .eq('is_active', true)
            .is('deleted_at', null);

        const { count: bookedRooms } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .eq('room_type_id', roomTypeId)
            .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
            .lt('check_in_date', checkOutDate)
            .gt('check_out_date', checkInDate);

        return Math.max(0, (totalRooms || 0) - (bookedRooms || 0));
    }

    /**
     * Get booking by ID
     */
    async getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        hotel:hotels(*),
        room_type:room_types(*),
        room:rooms(*),
        payment_sessions(*)
      `)
            .eq('id', bookingId)
            .single();

        if (error || !data) {
            return null;
        }

        return data as BookingWithDetails;
    }

    /**
     * Get booking by reference
     */
    async getBookingByReference(reference: string): Promise<BookingWithDetails | null> {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        hotel:hotels(*),
        room_type:room_types(*),
        room:rooms(*),
        payment_sessions(*)
      `)
            .eq('booking_reference', reference)
            .single();

        if (error || !data) {
            return null;
        }

        return data as BookingWithDetails;
    }

    /**
     * Get bookings for a user
     */
    async getUserBookings(
        userId: string,
        params: PaginationParams = {}
    ): Promise<PaginatedResponse<Booking>> {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('bookings')
            .select('*, hotel:hotels(name, city), room_type:room_types(name)', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw new Error(`Failed to fetch bookings: ${error.message}`);
        }

        return {
            data: data as Booking[],
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Get bookings for a hotel
     */
    async getHotelBookings(
        hotelId: string,
        params: PaginationParams & {
            status?: BookingStatus;
            from_date?: string;
            to_date?: string;
        } = {}
    ): Promise<PaginatedResponse<Booking>> {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('bookings')
            .select('*, room_type:room_types(name), room:rooms(room_number)', { count: 'exact' })
            .eq('hotel_id', hotelId)
            .order('check_in_date', { ascending: false });

        if (params.status) {
            query = query.eq('status', params.status);
        }

        if (params.from_date) {
            query = query.gte('check_in_date', params.from_date);
        }

        if (params.to_date) {
            query = query.lte('check_in_date', params.to_date);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            throw new Error(`Failed to fetch hotel bookings: ${error.message}`);
        }

        return {
            data: data as Booking[],
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Check-in a booking
     */
    async checkIn(
        bookingId: string,
        roomId: string,
        checkedInBy: string
    ): Promise<Booking> {
        const booking = await this.getBookingById(bookingId);

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== 'CONFIRMED') {
            throw new Error('Booking must be confirmed to check in');
        }

        // Update booking
        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: 'CHECKED_IN',
                room_id: roomId,
                actual_check_in: new Date().toISOString(),
                checked_in_by: checkedInBy,
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to check in: ${error.message}`);
        }

        // Update room status
        await supabase
            .from('rooms')
            .update({ status: 'OCCUPIED' })
            .eq('id', roomId);

        return data as Booking;
    }

    /**
     * Check-out a booking
     */
    async checkOut(
        bookingId: string,
        checkedOutBy: string
    ): Promise<Booking> {
        const booking = await this.getBookingById(bookingId);

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== 'CHECKED_IN') {
            throw new Error('Booking must be checked in to check out');
        }

        // Update booking
        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: 'CHECKED_OUT',
                actual_check_out: new Date().toISOString(),
                checked_out_by: checkedOutBy,
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to check out: ${error.message}`);
        }

        // Update room status to cleaning
        if (booking.room_id) {
            await supabase
                .from('rooms')
                .update({ status: 'CLEANING' })
                .eq('id', booking.room_id);
        }

        return data as Booking;
    }

    /**
     * Cancel a booking
     */
    async cancelBooking(
        bookingId: string,
        reason: string
    ): Promise<Booking> {
        const booking = await this.getBookingById(bookingId);

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(booking.status)) {
            throw new Error('Booking cannot be cancelled');
        }

        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: 'CANCELLED',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason,
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to cancel booking: ${error.message}`);
        }

        return data as Booking;
    }

    /**
     * Get today's arrivals for a hotel
     */
    async getTodayArrivals(hotelId: string): Promise<Booking[]> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('bookings')
            .select('*, room_type:room_types(name)')
            .eq('hotel_id', hotelId)
            .eq('check_in_date', today)
            .eq('status', 'CONFIRMED')
            .order('guest_name');

        if (error) {
            throw new Error(`Failed to fetch arrivals: ${error.message}`);
        }

        return data as Booking[];
    }

    /**
     * Get today's departures for a hotel
     */
    async getTodayDepartures(hotelId: string): Promise<Booking[]> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('bookings')
            .select('*, room_type:room_types(name), room:rooms(room_number)')
            .eq('hotel_id', hotelId)
            .eq('check_out_date', today)
            .eq('status', 'CHECKED_IN')
            .order('guest_name');

        if (error) {
            throw new Error(`Failed to fetch departures: ${error.message}`);
        }

        return data as Booking[];
    }
}

export const bookingService = new BookingService();
