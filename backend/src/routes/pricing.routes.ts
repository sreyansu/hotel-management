import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth.js';
import { requireHotelRole } from '../middlewares/rbac.js';
import { pricingService } from '../services/pricing.service.js';

/**
 * Pricing Routes
 */
export async function pricingRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Get pricing configuration for a hotel
     */
    fastify.get('/:hotelId/config', {
        preHandler: [authenticate, requireHotelRole('DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };

        const config = await pricingService.getPricingConfig(hotelId);
        return config;
    });

    /**
     * Get current occupancy for a hotel
     */
    fastify.get('/:hotelId/occupancy', {
        preHandler: [authenticate, requireHotelRole('DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { date } = request.query as { date?: string };

        const targetDate = date ? new Date(date) : new Date();
        const occupancy = await pricingService.getOccupancyPercentage(hotelId, targetDate);

        return { occupancy_percentage: occupancy };
    });

    /**
     * Update seasonal pricing (HOTEL_ADMIN only)
     */
    fastify.put('/:hotelId/seasonal', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { pricing } = request.body as {
            pricing: Parameters<typeof pricingService.updateSeasonalPricing>[1];
        };

        try {
            const updated = await pricingService.updateSeasonalPricing(hotelId, pricing);
            return updated;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update pricing';
            return reply.status(400).send({ error: 'Update Failed', message });
        }
    });

    /**
     * Update occupancy pricing tiers (HOTEL_ADMIN only)
     */
    fastify.put('/:hotelId/occupancy', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { pricing } = request.body as {
            pricing: Parameters<typeof pricingService.updateOccupancyPricing>[1];
        };

        try {
            const updated = await pricingService.updateOccupancyPricing(hotelId, pricing);
            return updated;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update pricing';
            return reply.status(400).send({ error: 'Update Failed', message });
        }
    });
}
