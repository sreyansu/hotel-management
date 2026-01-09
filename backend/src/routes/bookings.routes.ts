import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth.js';
import { requireHotelRole, requireOwnerOrStaff } from '../middlewares/rbac.js';
import { bookingService } from '../services/booking.service.js';
import { pricingService } from '../services/pricing.service.js';
import { couponService } from '../services/coupon.service.js';
import { paymentService } from '../services/payment.service.js';

/**
 * Booking Routes
 */
export async function bookingRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Calculate price for a booking (public/authenticated)
     */
    fastify.post('/calculate-price', async (request, reply) => {
        const { hotel_id, room_type_id, check_in_date, check_out_date, coupon_code } = request.body as {
            hotel_id: string;
            room_type_id: string;
            check_in_date: string;
            check_out_date: string;
            coupon_code?: string;
        };

        try {
            const checkIn = new Date(check_in_date);
            const checkOut = new Date(check_out_date);

            // Calculate coupon discount if provided
            let couponDiscount = 0;
            let couponInfo = null;

            if (coupon_code) {
                // Get base price first
                const tempPrice = await pricingService.calculatePrice(
                    hotel_id,
                    room_type_id,
                    checkIn,
                    checkOut,
                    0
                );

                const result = await couponService.validateCoupon(
                    coupon_code,
                    hotel_id,
                    tempPrice.subtotal
                );

                if (result.valid && result.discount_amount) {
                    couponDiscount = result.discount_amount;
                    couponInfo = {
                        code: result.coupon?.code,
                        discount: couponDiscount,
                        description: result.coupon?.description,
                    };
                } else {
                    return reply.status(400).send({
                        error: 'Invalid Coupon',
                        message: result.error || 'Coupon is not valid',
                    });
                }
            }

            const pricing = await pricingService.calculatePrice(
                hotel_id,
                room_type_id,
                checkIn,
                checkOut,
                couponDiscount
            );

            return {
                ...pricing,
                coupon: couponInfo,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to calculate price';
            return reply.status(400).send({ error: 'Calculation Failed', message });
        }
    });

    /**
     * Create a new booking (authenticated)
     */
    fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
        const bookingData = request.body as Parameters<typeof bookingService.createBooking>[0];

        try {
            const booking = await bookingService.createBooking(bookingData, request.user!.id);
            return reply.status(201).send(booking);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create booking';
            return reply.status(400).send({ error: 'Booking Failed', message });
        }
    });

    /**
     * Get booking by ID
     */
    fastify.get('/:bookingId', { preHandler: [authenticate] }, async (request, reply) => {
        const { bookingId } = request.params as { bookingId: string };

        const booking = await bookingService.getBookingById(bookingId);

        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        // Check access: owner or hotel staff
        const user = request.user!;
        const isOwner = booking.user_id === user.id;
        const isStaff = user.hotel_ids.includes(booking.hotel_id) || user.highest_role === 'SUPER_ADMIN';

        if (!isOwner && !isStaff) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Access denied' });
        }

        return booking;
    });

    /**
     * Get booking by reference
     */
    fastify.get('/reference/:reference', { preHandler: [authenticate] }, async (request, reply) => {
        const { reference } = request.params as { reference: string };

        const booking = await bookingService.getBookingByReference(reference);

        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        // Check access
        const user = request.user!;
        const isOwner = booking.user_id === user.id;
        const isStaff = user.hotel_ids.includes(booking.hotel_id) || user.highest_role === 'SUPER_ADMIN';

        if (!isOwner && !isStaff) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Access denied' });
        }

        return booking;
    });

    /**
     * Get current user's bookings
     */
    fastify.get('/my-bookings', { preHandler: [authenticate] }, async (request, reply) => {
        const { page, limit } = request.query as { page?: string; limit?: string };

        const bookings = await bookingService.getUserBookings(request.user!.id, {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });

        return bookings;
    });

    /**
     * Get hotel bookings (staff only)
     */
    fastify.get('/hotel/:hotelId', {
        preHandler: [authenticate, requireHotelRole('RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { page, limit, status, from_date, to_date } = request.query as {
            page?: string;
            limit?: string;
            status?: string;
            from_date?: string;
            to_date?: string;
        };

        const bookings = await bookingService.getHotelBookings(hotelId, {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            status: status as any,
            from_date,
            to_date,
        });

        return bookings;
    });

    /**
     * Get today's arrivals
     */
    fastify.get('/hotel/:hotelId/arrivals', {
        preHandler: [authenticate, requireHotelRole('RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const arrivals = await bookingService.getTodayArrivals(hotelId);
        return arrivals;
    });

    /**
     * Get today's departures
     */
    fastify.get('/hotel/:hotelId/departures', {
        preHandler: [authenticate, requireHotelRole('RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const departures = await bookingService.getTodayDepartures(hotelId);
        return departures;
    });

    /**
     * Check-in booking
     */
    fastify.put('/:bookingId/check-in', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const { bookingId } = request.params as { bookingId: string };
        const { room_id } = request.body as { room_id: string };

        // Get booking first to check hotel access
        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        const user = request.user!;
        const canCheckIn =
            user.highest_role === 'SUPER_ADMIN' ||
            (user.hotel_ids.includes(booking.hotel_id) &&
                ['RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN'].some(r =>
                    user.roles.some(ur => ur.role === r)));

        if (!canCheckIn) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Cannot check in this booking' });
        }

        try {
            const updated = await bookingService.checkIn(bookingId, room_id, user.id);
            return updated;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Check-in failed';
            return reply.status(400).send({ error: 'Check-in Failed', message });
        }
    });

    /**
     * Check-out booking
     */
    fastify.put('/:bookingId/check-out', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const { bookingId } = request.params as { bookingId: string };

        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        const user = request.user!;
        const canCheckOut =
            user.highest_role === 'SUPER_ADMIN' ||
            (user.hotel_ids.includes(booking.hotel_id) &&
                ['RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN'].some(r =>
                    user.roles.some(ur => ur.role === r)));

        if (!canCheckOut) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Cannot check out this booking' });
        }

        try {
            const updated = await bookingService.checkOut(bookingId, user.id);
            return updated;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Check-out failed';
            return reply.status(400).send({ error: 'Check-out Failed', message });
        }
    });

    /**
     * Cancel booking
     */
    fastify.put('/:bookingId/cancel', { preHandler: [authenticate] }, async (request, reply) => {
        const { bookingId } = request.params as { bookingId: string };
        const { reason } = request.body as { reason: string };

        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        const user = request.user!;
        const isOwner = booking.user_id === user.id;
        const isStaff =
            user.highest_role === 'SUPER_ADMIN' ||
            (user.hotel_ids.includes(booking.hotel_id) &&
                ['DUTY_MANAGER', 'HOTEL_ADMIN'].some(r => user.roles.some(ur => ur.role === r)));

        if (!isOwner && !isStaff) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Cannot cancel this booking' });
        }

        try {
            const cancelled = await bookingService.cancelBooking(bookingId, reason);
            return cancelled;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Cancellation failed';
            return reply.status(400).send({ error: 'Cancellation Failed', message });
        }
    });

    // =========================================
    // Payment Sessions
    // =========================================

    /**
     * Create payment session for a booking
     */
    fastify.post('/:bookingId/payment-session', { preHandler: [authenticate] }, async (request, reply) => {
        const { bookingId } = request.params as { bookingId: string };

        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        // Only booking owner or staff can create payment session
        const user = request.user!;
        const isOwner = booking.user_id === user.id;
        const isStaff = user.hotel_ids.includes(booking.hotel_id) || user.highest_role === 'SUPER_ADMIN';

        if (!isOwner && !isStaff) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Access denied' });
        }

        if (booking.status !== 'PENDING') {
            return reply.status(400).send({
                error: 'Invalid Status',
                message: 'Payment session can only be created for pending bookings',
            });
        }

        try {
            const session = await paymentService.createPaymentSession(bookingId, booking.total_amount);
            return {
                ...session,
                remaining_seconds: paymentService.getRemainingTime(session),
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create payment session';
            return reply.status(400).send({ error: 'Session Failed', message });
        }
    });

    /**
     * Get payment session status
     */
    fastify.get('/payment-session/:sessionId', { preHandler: [authenticate] }, async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };

        const session = await paymentService.getPaymentSession(sessionId);
        if (!session) {
            return reply.status(404).send({ error: 'Not Found', message: 'Session not found' });
        }

        return {
            ...session,
            remaining_seconds: paymentService.getRemainingTime(session),
        };
    });

    /**
     * Verify payment (staff only)
     */
    fastify.post('/payment-session/:sessionId/verify', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };
        const { transaction_id, payment_method } = request.body as {
            transaction_id: string;
            payment_method: string;
        };

        const session = await paymentService.getPaymentSession(sessionId);
        if (!session) {
            return reply.status(404).send({ error: 'Not Found', message: 'Session not found' });
        }

        // Get booking to check hotel access
        const booking = await bookingService.getBookingById(session.booking_id);
        if (!booking) {
            return reply.status(404).send({ error: 'Not Found', message: 'Booking not found' });
        }

        const user = request.user!;
        const canVerify =
            user.highest_role === 'SUPER_ADMIN' ||
            (user.hotel_ids.includes(booking.hotel_id) &&
                ['RECEPTION', 'DUTY_MANAGER', 'ACCOUNTS', 'HOTEL_ADMIN'].some(r =>
                    user.roles.some(ur => ur.role === r)));

        if (!canVerify) {
            return reply.status(403).send({ error: 'Forbidden', message: 'Cannot verify payments' });
        }

        try {
            const payment = await paymentService.verifyPayment(
                sessionId,
                transaction_id,
                payment_method,
                user.id
            );
            return payment;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Verification failed';
            return reply.status(400).send({ error: 'Verification Failed', message });
        }
    });
}
