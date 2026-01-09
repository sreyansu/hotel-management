import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth.js';
import { requireHotelRole, requireRole } from '../middlewares/rbac.js';
import { supabase } from '../config/database.js';
import { firebaseAuth } from '../config/firebase.js';
import { UserRole } from '../types/index.js';

/**
 * Staff Management Routes
 */
export async function staffRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Get all staff for a hotel
     */
    fastify.get('/hotel/:hotelId', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };

        const { data, error } = await supabase
            .from('user_roles')
            .select(`
        *,
        user:users(id, email, full_name, phone, avatar_url, is_active, created_at)
      `)
            .eq('hotel_id', hotelId)
            .neq('role', 'CUSTOMER');

        if (error) {
            return reply.status(400).send({ error: 'Fetch Failed', message: error.message });
        }

        // Group by user
        const staffMap = new Map<string, { user: any; roles: string[] }>();
        for (const item of data || []) {
            const userId = item.user?.id;
            if (!userId) continue;

            if (!staffMap.has(userId)) {
                staffMap.set(userId, { user: item.user, roles: [] });
            }
            staffMap.get(userId)!.roles.push(item.role);
        }

        return Array.from(staffMap.values());
    });

    /**
     * Add staff member to a hotel
     */
    fastify.post('/hotel/:hotelId', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId } = request.params as { hotelId: string };
        const { email, password, full_name, phone, role } = request.body as {
            email: string;
            password: string;
            full_name: string;
            phone?: string;
            role: UserRole;
        };

        // Validate role
        const allowedRoles: UserRole[] = ['DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTS'];
        if (!allowedRoles.includes(role)) {
            return reply.status(400).send({
                error: 'Invalid Role',
                message: `Role must be one of: ${allowedRoles.join(', ')}`,
            });
        }

        try {
            // Create Firebase user
            const firebaseUser = await firebaseAuth.createUser({
                email,
                password,
                displayName: full_name,
            });

            // Create user in database
            const { data: user, error: userError } = await supabase
                .from('users')
                .insert({
                    firebase_uid: firebaseUser.uid,
                    email,
                    full_name,
                    phone,
                })
                .select()
                .single();

            if (userError) {
                await firebaseAuth.deleteUser(firebaseUser.uid);
                throw new Error(userError.message);
            }

            // Assign role
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: user.id,
                    role,
                    hotel_id: hotelId,
                    assigned_by: request.user!.id,
                });

            if (roleError) {
                throw new Error(roleError.message);
            }

            return reply.status(201).send({
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                },
                role,
                hotel_id: hotelId,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create staff';
            return reply.status(400).send({ error: 'Creation Failed', message });
        }
    });

    /**
     * Update staff role
     */
    fastify.put('/hotel/:hotelId/user/:userId', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId, userId } = request.params as { hotelId: string; userId: string };
        const { role } = request.body as { role: UserRole };

        // Validate role
        const allowedRoles: UserRole[] = ['DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTS'];
        if (!allowedRoles.includes(role)) {
            return reply.status(400).send({
                error: 'Invalid Role',
                message: `Role must be one of: ${allowedRoles.join(', ')}`,
            });
        }

        // Delete existing role for this hotel
        await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('hotel_id', hotelId);

        // Add new role
        const { error } = await supabase
            .from('user_roles')
            .insert({
                user_id: userId,
                role,
                hotel_id: hotelId,
                assigned_by: request.user!.id,
            });

        if (error) {
            return reply.status(400).send({ error: 'Update Failed', message: error.message });
        }

        return { message: 'Role updated successfully' };
    });

    /**
     * Remove staff from hotel
     */
    fastify.delete('/hotel/:hotelId/user/:userId', {
        preHandler: [authenticate, requireHotelRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { hotelId, userId } = request.params as { hotelId: string; userId: string };

        const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('hotel_id', hotelId);

        if (error) {
            return reply.status(400).send({ error: 'Deletion Failed', message: error.message });
        }

        return { message: 'Staff removed from hotel' };
    });

    /**
     * Deactivate a user account
     */
    fastify.put('/user/:userId/deactivate', {
        preHandler: [authenticate, requireRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };

        const { error } = await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', userId);

        if (error) {
            return reply.status(400).send({ error: 'Deactivation Failed', message: error.message });
        }

        return { message: 'User deactivated' };
    });

    /**
     * Reactivate a user account
     */
    fastify.put('/user/:userId/activate', {
        preHandler: [authenticate, requireRole('HOTEL_ADMIN')],
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };

        const { error } = await supabase
            .from('users')
            .update({ is_active: true })
            .eq('id', userId);

        if (error) {
            return reply.status(400).send({ error: 'Activation Failed', message: error.message });
        }

        return { message: 'User activated' };
    });
}
