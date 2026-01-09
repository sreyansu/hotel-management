import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth.js';
import { requireHotelRole } from '../middlewares/rbac.js';
import { supabase } from '../config/database.js';

/**
 * Reports Routes
 */
export async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Get occupancy report
     */
    fastify.get('/hotel/:hotelId/occupancy', {
        preHandler: [authenticate, requireHotelRole('DUTY_MANAGER', 'HOTEL_ADMIN', 'ACCOUNTS')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { from_date, to_date } = request.query as {
            from_date?: string;
            to_date?: string;
        };

        const startDate = from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = to_date || new Date().toISOString().split('T')[0];

        // Get total rooms
        const { count: totalRooms } = await supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .eq('is_active', true);

        // Get bookings in date range
        const { data: bookings } = await supabase
            .from('bookings')
            .select('check_in_date, check_out_date, status')
            .eq('hotel_id', hotelId)
            .in('status', ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'])
            .gte('check_in_date', startDate)
            .lte('check_in_date', endDate);

        // Calculate daily occupancy
        const dailyOccupancy: Record<string, number> = {};
        const currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0] as string;
            const occupied = bookings?.filter(b =>
                b.check_in_date <= dateStr && b.check_out_date > dateStr
            ).length || 0;

            dailyOccupancy[dateStr] = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const avgOccupancy = Object.values(dailyOccupancy).reduce((a, b) => a + b, 0) /
            Object.keys(dailyOccupancy).length;

        return {
            total_rooms: totalRooms,
            average_occupancy: Math.round(avgOccupancy),
            daily_occupancy: dailyOccupancy,
            period: { from: startDate, to: endDate },
        };
    });

    /**
     * Get revenue report
     */
    fastify.get('/hotel/:hotelId/revenue', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN', 'ACCOUNTS')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { from_date, to_date } = request.query as {
            from_date?: string;
            to_date?: string;
        };

        const startDate = from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = to_date || new Date().toISOString().split('T')[0];

        // Get completed bookings
        const { data: bookings } = await supabase
            .from('bookings')
            .select('total_amount, coupon_discount, taxes, created_at, status')
            .eq('hotel_id', hotelId)
            .in('status', ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'])
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

        // Calculate totals
        const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.total_amount), 0) || 0;
        const totalTaxes = bookings?.reduce((sum, b) => sum + parseFloat(b.taxes), 0) || 0;
        const totalDiscounts = bookings?.reduce((sum, b) => sum + parseFloat(b.coupon_discount), 0) || 0;
        const bookingCount = bookings?.length || 0;

        // Daily revenue
        const dailyRevenue: Record<string, number> = {};
        for (const booking of bookings || []) {
            const date = booking.created_at.split('T')[0] as string;
            dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(booking.total_amount);
        }

        return {
            total_revenue: Math.round(totalRevenue * 100) / 100,
            total_taxes: Math.round(totalTaxes * 100) / 100,
            total_discounts: Math.round(totalDiscounts * 100) / 100,
            booking_count: bookingCount,
            average_booking_value: bookingCount > 0 ? Math.round((totalRevenue / bookingCount) * 100) / 100 : 0,
            daily_revenue: dailyRevenue,
            period: { from: startDate, to: endDate },
        };
    });

    /**
     * Get booking statistics
     */
    fastify.get('/hotel/:hotelId/bookings', {
        preHandler: [authenticate, requireHotelRole('DUTY_MANAGER', 'HOTEL_ADMIN', 'ACCOUNTS')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { from_date, to_date } = request.query as {
            from_date?: string;
            to_date?: string;
        };

        const startDate = from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = to_date || new Date().toISOString().split('T')[0];

        // Get all bookings in range
        const { data: bookings } = await supabase
            .from('bookings')
            .select('status, created_at')
            .eq('hotel_id', hotelId)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

        // Count by status
        const byStatus: Record<string, number> = {};
        for (const booking of bookings || []) {
            byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
        }

        // Daily bookings
        const dailyBookings: Record<string, number> = {};
        for (const booking of bookings || []) {
            const date = booking.created_at.split('T')[0] as string;
            dailyBookings[date] = (dailyBookings[date] || 0) + 1;
        }

        return {
            total_bookings: bookings?.length || 0,
            by_status: byStatus,
            daily_bookings: dailyBookings,
            period: { from: startDate, to: endDate },
        };
    });

    /**
     * Get room type performance
     */
    fastify.get('/hotel/:hotelId/room-types', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { from_date, to_date } = request.query as {
            from_date?: string;
            to_date?: string;
        };

        const startDate = from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = to_date || new Date().toISOString().split('T')[0];

        // Get room types
        const { data: roomTypes } = await supabase
            .from('room_types')
            .select('id, name, base_price')
            .eq('hotel_id', hotelId)
            .eq('is_active', true);

        // Get bookings by room type
        const { data: bookings } = await supabase
            .from('bookings')
            .select('room_type_id, total_amount, status')
            .eq('hotel_id', hotelId)
            .in('status', ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'])
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

        // Aggregate by room type
        const performance = roomTypes?.map(rt => {
            const rtBookings = bookings?.filter(b => b.room_type_id === rt.id) || [];
            const revenue = rtBookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);

            return {
                room_type_id: rt.id,
                name: rt.name,
                base_price: rt.base_price,
                booking_count: rtBookings.length,
                total_revenue: Math.round(revenue * 100) / 100,
            };
        });

        return {
            room_types: performance,
            period: { from: startDate, to: endDate },
        };
    });
}
