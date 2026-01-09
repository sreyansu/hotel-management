import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';
import { requireRole, requireHotelRole } from '../middlewares/rbac.js';
import { hotelService } from '../services/hotel.service.js';

/**
 * Hotel Routes
 */
export async function hotelRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Get all hotels (public)
     */
    fastify.get('/', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
        const { page, limit, city } = request.query as {
            page?: string;
            limit?: string;
            city?: string;
        };

        const result = await hotelService.getHotels({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            city,
        });

        return result;
    });

    /**
     * Get hotel by slug (public) - MUST be before /:hotelId to avoid route conflicts
     */
    fastify.get('/slug/:slug', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
        const { slug } = request.params as { slug: string };

        const hotel = await hotelService.getHotelBySlug(slug);

        if (!hotel) {
            return reply.status(404).send({ error: 'Not Found', message: 'Hotel not found' });
        }

        return hotel;
    });

    /**
     * Get hotel by ID (public)
     */
    fastify.get('/:hotelId', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };

        const hotel = await hotelService.getHotelById(hotelId);

        if (!hotel) {
            return reply.status(404).send({ error: 'Not Found', message: 'Hotel not found' });
        }

        return hotel;
    });

    /**
     * Create a new hotel (SUPER_ADMIN only)
     */
    fastify.post('/', {
        preHandler: [authenticate, requireRole('SUPER_ADMIN')],
    }, async (request, reply) => {
        const hotelData = request.body as Parameters<typeof hotelService.createHotel>[0];

        try {
            const hotel = await hotelService.createHotel(hotelData);
            return reply.status(201).send(hotel);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create hotel';
            return reply.status(400).send({ error: 'Creation Failed', message });
        }
    });

    /**
     * Update hotel (HOTEL_ADMIN+)
     */
    fastify.put('/:hotelId', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const updates = request.body as Parameters<typeof hotelService.updateHotel>[1];

        try {
            const hotel = await hotelService.updateHotel(hotelId, updates);
            return hotel;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update hotel';
            return reply.status(400).send({ error: 'Update Failed', message });
        }
    });

    // =========================================
    // Room Types
    // =========================================

    /**
     * Get room types for a hotel (public)
     */
    fastify.get('/:hotelId/room-types', {
        preHandler: [optionalAuthenticate],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { check_in_date, check_out_date } = request.query as {
            check_in_date?: string;
            check_out_date?: string;
        };

        const roomTypes = await hotelService.getRoomTypes(hotelId, check_in_date, check_out_date);
        return roomTypes;
    });

    /**
     * Create room type (HOTEL_ADMIN+)
     */
    fastify.post('/:hotelId/room-types', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const data = request.body as Omit<Parameters<typeof hotelService.createRoomType>[0], 'hotel_id'>;

        try {
            const roomType = await hotelService.createRoomType({ ...data, hotel_id: hotelId });
            return reply.status(201).send(roomType);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create room type';
            return reply.status(400).send({ error: 'Creation Failed', message });
        }
    });

    /**
     * Update room type (HOTEL_ADMIN+)
     */
    fastify.put('/:hotelId/room-types/:roomTypeId', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { roomTypeId } = request.params as { hotelId: string; roomTypeId: string };
        const updates = request.body as Parameters<typeof hotelService.updateRoomType>[1];

        try {
            const roomType = await hotelService.updateRoomType(roomTypeId, updates);
            return roomType;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update room type';
            return reply.status(400).send({ error: 'Update Failed', message });
        }
    });

    // =========================================
    // Rooms
    // =========================================

    /**
     * Get all rooms for a hotel (staff only)
     */
    fastify.get('/:hotelId/rooms', {
        preHandler: [authenticate, requireHotelRole('HOUSEKEEPING', 'RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { status, room_type_id } = request.query as {
            status?: string;
            room_type_id?: string;
        };

        const rooms = await hotelService.getRooms(hotelId, {
            status: status as any,
            room_type_id,
        });
        return rooms;
    });

    /**
     * Get available rooms for check-in
     */
    fastify.get('/:hotelId/rooms/available/:roomTypeId', {
        preHandler: [authenticate, requireHotelRole('RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId, roomTypeId } = request.params as { hotelId: string; roomTypeId: string };

        const rooms = await hotelService.getAvailableRooms(hotelId, roomTypeId);
        return rooms;
    });

    /**
     * Create a room (HOTEL_ADMIN+)
     */
    fastify.post('/:hotelId/rooms', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const data = request.body as Omit<Parameters<typeof hotelService.createRoom>[0], 'hotel_id'>;

        try {
            const room = await hotelService.createRoom({ ...data, hotel_id: hotelId });
            return reply.status(201).send(room);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create room';
            return reply.status(400).send({ error: 'Creation Failed', message });
        }
    });

    /**
     * Update room status
     */
    fastify.put('/:hotelId/rooms/:roomId/status', {
        preHandler: [authenticate, requireHotelRole('HOUSEKEEPING', 'RECEPTION', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { roomId } = request.params as { hotelId: string; roomId: string };
        const { status, notes } = request.body as { status: string; notes?: string };

        try {
            const room = await hotelService.updateRoomStatus(roomId, status as any, request.user!.id, notes);
            return room;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update room status';
            return reply.status(400).send({ error: 'Update Failed', message });
        }
    });

    /**
     * Get housekeeping logs for a room
     */
    fastify.get('/:hotelId/rooms/:roomId/logs', {
        preHandler: [authenticate, requireHotelRole('HOUSEKEEPING', 'DUTY_MANAGER', 'HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { roomId } = request.params as { hotelId: string; roomId: string };

        const logs = await hotelService.getHousekeepingLogs(roomId);
        return logs;
    });
}
