import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth.js';
import { requireHotelRole, requireRole } from '../middlewares/rbac.js';
import { couponService } from '../services/coupon.service.js';

/**
 * Coupon Routes
 */
export async function couponRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Validate a coupon code (public)
     */
    fastify.post('/validate', async (request, reply) => {
        const { code, hotel_id, booking_amount } = request.body as {
            code: string;
            hotel_id: string;
            booking_amount: number;
        };

        const result = await couponService.validateCoupon(code, hotel_id, booking_amount);

        if (!result.valid) {
            return reply.status(400).send({
                valid: false,
                error: result.error,
            });
        }

        return {
            valid: true,
            coupon: {
                code: result.coupon?.code,
                description: result.coupon?.description,
                discount_type: result.coupon?.discount_type,
                discount_value: result.coupon?.discount_value,
            },
            discount_amount: result.discount_amount,
        };
    });

    /**
     * Get coupons for a hotel (HOTEL_ADMIN+)
     */
    fastify.get('/hotel/:hotelId', {
        preHandler: [authenticate, requireHotelRole('DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const coupons = await couponService.getCoupons(hotelId);
        return coupons;
    });

    /**
     * Get all global coupons (SUPER_ADMIN)
     */
    fastify.get('/global', {
        preHandler: [authenticate, requireRole('SUPER_ADMIN')],
    }, async (request, reply) => {
        const coupons = await couponService.getCoupons();
        return coupons.filter(c => !c.hotel_id);
    });

    /**
     * Create a coupon
     */
    fastify.post('/', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const couponData = request.body as Parameters<typeof couponService.createCoupon>[0];
        const user = request.user!;

        // Check permissions
        if (couponData.hotel_id) {
            // Hotel-specific coupon - need HOTEL_ADMIN for that hotel
            if (user.highest_role !== 'SUPER_ADMIN' && !user.hotel_ids.includes(couponData.hotel_id)) {
                return reply.status(403).send({ error: 'Forbidden', message: 'Cannot create coupons for this hotel' });
            }
        } else {
            // Global coupon - need SUPER_ADMIN
            if (user.highest_role !== 'SUPER_ADMIN') {
                return reply.status(403).send({ error: 'Forbidden', message: 'Only super admin can create global coupons' });
            }
        }

        try {
            const coupon = await couponService.createCoupon(couponData, user.id);
            return reply.status(201).send(coupon);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create coupon';
            return reply.status(400).send({ error: 'Creation Failed', message });
        }
    });

    /**
     * Update a coupon
     */
    fastify.put('/:couponId', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const { couponId } = request.params as { couponId: string };
        const updates = request.body as Parameters<typeof couponService.updateCoupon>[1];

        try {
            const coupon = await couponService.updateCoupon(couponId, updates);
            return coupon;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update coupon';
            return reply.status(400).send({ error: 'Update Failed', message });
        }
    });

    /**
     * Deactivate (delete) a coupon
     */
    fastify.delete('/:couponId', {
        preHandler: [authenticate, requireRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { couponId } = request.params as { couponId: string };

        try {
            await couponService.deactivateCoupon(couponId);
            return { message: 'Coupon deactivated successfully' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to deactivate coupon';
            return reply.status(400).send({ error: 'Deactivation Failed', message });
        }
    });

    /**
     * Get coupon statistics
     */
    fastify.get('/:couponId/stats', {
        preHandler: [authenticate, requireRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { couponId } = request.params as { couponId: string };

        try {
            const stats = await couponService.getCouponStats(couponId);
            return stats;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch stats';
            return reply.status(400).send({ error: 'Stats Failed', message });
        }
    });
}
