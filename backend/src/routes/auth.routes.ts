import { FastifyInstance } from 'fastify';
import { supabase } from '../config/database.js';
import { firebaseAuth } from '../config/firebase.js';
import { authenticate } from '../middlewares/auth.js';

/**
 * Authentication Routes
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Register a new user
     * Creates user in both Firebase and our database
     */
    fastify.post('/register', async (request, reply) => {
        const { email, password, full_name, phone } = request.body as {
            email: string;
            password: string;
            full_name: string;
            phone?: string;
        };

        try {
            // Create Firebase user
            const firebaseUser = await firebaseAuth.createUser({
                email,
                password,
                displayName: full_name,
            });

            // Create user in our database
            const { data: user, error } = await supabase
                .from('users')
                .insert({
                    firebase_uid: firebaseUser.uid,
                    email,
                    full_name,
                    phone,
                })
                .select()
                .single();

            if (error) {
                // Rollback Firebase user if database insert fails
                await firebaseAuth.deleteUser(firebaseUser.uid);
                throw new Error(`Failed to create user: ${error.message}`);
            }

            // Assign customer role
            await supabase
                .from('user_roles')
                .insert({
                    user_id: user.id,
                    role: 'CUSTOMER',
                });

            return reply.status(201).send({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            return reply.status(400).send({ error: 'Registration Failed', message });
        }
    });

    /**
     * Get current user profile
     */
    fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user!;

        // Get full user details
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
        }

        return {
            ...data,
            roles: user.roles,
            highest_role: user.highest_role,
            hotel_ids: user.hotel_ids,
        };
    });

    /**
     * Update current user profile
     */
    fastify.put('/me', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user!;
        const { full_name, phone, avatar_url } = request.body as {
            full_name?: string;
            phone?: string;
            avatar_url?: string;
        };

        const updates: Record<string, unknown> = {};
        if (full_name) updates.full_name = full_name;
        if (phone) updates.phone = phone;
        if (avatar_url) updates.avatar_url = avatar_url;

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            return reply.status(400).send({ error: 'Update Failed', message: error.message });
        }

        return data;
    });

    /**
     * Sync Firebase user to database (for existing Firebase users)
     */
    fastify.post('/sync', async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Missing token' });
        }

        try {
            const token = authHeader.substring(7);
            const decodedToken = await firebaseAuth.verifyIdToken(token);

            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('firebase_uid', decodedToken.uid)
                .single();

            if (existingUser) {
                return existingUser;
            }

            // Create new user
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    firebase_uid: decodedToken.uid,
                    email: decodedToken.email || '',
                    full_name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            // Assign customer role
            await supabase
                .from('user_roles')
                .insert({
                    user_id: newUser.id,
                    role: 'CUSTOMER',
                });

            return reply.status(201).send(newUser);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Sync failed';
            return reply.status(400).send({ error: 'Sync Failed', message });
        }
    });
}
