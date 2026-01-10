import { FastifyInstance } from 'fastify';
import { supabase } from '../config/database.js';
import { firebaseAuth } from '../config/firebase.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

// Default admin credentials - CHANGE THESE IN PRODUCTION
const DEFAULT_ADMIN = {
    email: 'admin@grandpalace.com',
    password: 'Admin@123456',
    full_name: 'Super Admin',
};

/**
 * Admin Management Routes
 */
export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Setup initial admin account
     * This should only work if no SUPER_ADMIN exists
     */
    fastify.post('/setup', async (request, reply) => {
        try {
            // Check if any SUPER_ADMIN already exists
            const { data: existingAdmin } = await supabase
                .from('user_roles')
                .select('id')
                .eq('role', 'SUPER_ADMIN')
                .limit(1);

            if (existingAdmin && existingAdmin.length > 0) {
                return reply.status(400).send({
                    error: 'Setup Already Complete',
                    message: 'A super admin already exists. Use the admin panel to manage users.',
                });
            }

            // Create Firebase user for admin
            let firebaseUser;
            try {
                firebaseUser = await firebaseAuth.createUser({
                    email: DEFAULT_ADMIN.email,
                    password: DEFAULT_ADMIN.password,
                    displayName: DEFAULT_ADMIN.full_name,
                });
            } catch (fbError: any) {
                // If user already exists in Firebase, get their UID
                if (fbError.code === 'auth/email-already-exists') {
                    const existingFbUser = await firebaseAuth.getUserByEmail(DEFAULT_ADMIN.email);
                    firebaseUser = existingFbUser;
                } else {
                    throw fbError;
                }
            }

            // Check if user exists in our database
            let user;
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('firebase_uid', firebaseUser.uid)
                .single();

            if (existingUser) {
                user = existingUser;
            } else {
                // Create user in database
                const { data: newUser, error: userError } = await supabase
                    .from('users')
                    .insert({
                        firebase_uid: firebaseUser.uid,
                        email: DEFAULT_ADMIN.email,
                        full_name: DEFAULT_ADMIN.full_name,
                    })
                    .select()
                    .single();

                if (userError) {
                    throw new Error(`Failed to create admin user: ${userError.message}`);
                }
                user = newUser;
            }

            // Assign SUPER_ADMIN role
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: user.id,
                    role: 'SUPER_ADMIN',
                });

            if (roleError && !roleError.message.includes('duplicate')) {
                throw new Error(`Failed to assign admin role: ${roleError.message}`);
            }

            return reply.status(201).send({
                message: 'Admin setup complete!',
                credentials: {
                    email: DEFAULT_ADMIN.email,
                    password: DEFAULT_ADMIN.password,
                },
                warning: 'Please change the password after first login!',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Setup failed';
            fastify.log.error({ err: error }, 'Admin setup error');
            return reply.status(500).send({ error: 'Setup Failed', message });
        }
    });

    /**
     * Get all users with their roles (Super Admin only)
     */
    fastify.get(
        '/users',
        { preHandler: [authenticate, requireRole(['SUPER_ADMIN'])] },
        async (request, reply) => {
            const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
            const offset = (page - 1) * limit;

            const { data: users, error, count } = await supabase
                .from('users')
                .select(`
                    *,
                    user_roles (
                        id,
                        role,
                        hotel_id
                    )
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return reply.status(500).send({ error: 'Database Error', message: error.message });
            }

            return {
                data: users,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                },
            };
        }
    );

    /**
     * Assign a role to a user (Super Admin or Hotel Admin)
     */
    fastify.post(
        '/users/:userId/roles',
        { preHandler: [authenticate, requireRole(['SUPER_ADMIN', 'HOTEL_ADMIN'])] },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };
            const { role, hotel_id } = request.body as { role: string; hotel_id?: string };
            const currentUser = request.user!;

            // Validate role
            const validRoles = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTS', 'CUSTOMER'];
            if (!validRoles.includes(role)) {
                return reply.status(400).send({ error: 'Invalid Role', message: 'Invalid role specified' });
            }

            // Only SUPER_ADMIN can assign SUPER_ADMIN or HOTEL_ADMIN roles
            if (['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(role) && currentUser.highest_role !== 'SUPER_ADMIN') {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Only Super Admin can assign admin roles',
                });
            }

            // Check if user exists
            const { data: targetUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();

            if (userError || !targetUser) {
                return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
            }

            // Assign role
            const { data: newRole, error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role,
                    hotel_id: hotel_id || null,
                    assigned_by: currentUser.id,
                })
                .select()
                .single();

            if (roleError) {
                if (roleError.message.includes('duplicate')) {
                    return reply.status(400).send({
                        error: 'Duplicate Role',
                        message: 'User already has this role',
                    });
                }
                return reply.status(500).send({ error: 'Database Error', message: roleError.message });
            }

            return reply.status(201).send({
                message: 'Role assigned successfully',
                role: newRole,
            });
        }
    );

    /**
     * Remove a role from a user (Super Admin only)
     */
    fastify.delete(
        '/users/:userId/roles/:roleId',
        { preHandler: [authenticate, requireRole(['SUPER_ADMIN'])] },
        async (request, reply) => {
            const { userId, roleId } = request.params as { userId: string; roleId: string };

            // Prevent removing the last SUPER_ADMIN
            const { data: adminCount } = await supabase
                .from('user_roles')
                .select('id')
                .eq('role', 'SUPER_ADMIN');

            const { data: roleToDelete } = await supabase
                .from('user_roles')
                .select('role')
                .eq('id', roleId)
                .single();

            if (roleToDelete?.role === 'SUPER_ADMIN' && adminCount && adminCount.length <= 1) {
                return reply.status(400).send({
                    error: 'Cannot Remove',
                    message: 'Cannot remove the last Super Admin',
                });
            }

            const { error } = await supabase
                .from('user_roles')
                .delete()
                .eq('id', roleId)
                .eq('user_id', userId);

            if (error) {
                return reply.status(500).send({ error: 'Database Error', message: error.message });
            }

            return { message: 'Role removed successfully' };
        }
    );

    /**
     * Create a new admin user (Super Admin only)
     */
    fastify.post(
        '/users',
        { preHandler: [authenticate, requireRole(['SUPER_ADMIN'])] },
        async (request, reply) => {
            const { email, password, full_name, phone, role, hotel_id } = request.body as {
                email: string;
                password: string;
                full_name: string;
                phone?: string;
                role: string;
                hotel_id?: string;
            };

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
                    throw new Error(`Failed to create user: ${userError.message}`);
                }

                // Assign role
                await supabase
                    .from('user_roles')
                    .insert({
                        user_id: user.id,
                        role,
                        hotel_id: hotel_id || null,
                        assigned_by: request.user!.id,
                    });

                return reply.status(201).send({
                    message: 'Admin user created successfully',
                    user: {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        role,
                    },
                });
            } catch (error: any) {
                if (error.code === 'auth/email-already-exists') {
                    return reply.status(400).send({
                        error: 'Email Exists',
                        message: 'A user with this email already exists',
                    });
                }
                const message = error instanceof Error ? error.message : 'Failed to create user';
                return reply.status(500).send({ error: 'Creation Failed', message });
            }
        }
    );
}
