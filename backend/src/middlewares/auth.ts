import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyFirebaseToken, DecodedFirebaseToken } from '../config/firebase.js';
import { supabase } from '../config/database.js';
import { UserWithRoles, UserRole, UserRoleAssignment } from '../types/index.js';

// Extend FastifyRequest to include user
declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthenticatedUser;
    }
}

export interface AuthenticatedUser {
    id: string;
    firebase_uid: string;
    email: string;
    full_name: string;
    roles: UserRoleAssignment[];
    highest_role: UserRole;
    hotel_ids: string[];
}

/**
 * Authentication middleware that verifies Firebase ID tokens
 * and attaches user information to the request
 */
export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header',
            });
        }

        const token = authHeader.substring(7);
        const decodedToken = await verifyFirebaseToken(token);

        if (!decodedToken) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid or expired token',
            });
        }

        // Get user from database
        const user = await getUserByFirebaseUid(decodedToken.uid);

        if (!user) {
            // User not found - could be a new registration
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'User not found. Please complete registration.',
            });
        }

        if (!user.is_active) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'User account is deactivated',
            });
        }

        // Attach user to request
        request.user = {
            id: user.id,
            firebase_uid: user.firebase_uid,
            email: user.email,
            full_name: user.full_name,
            roles: user.roles,
            highest_role: getHighestRole(user.roles),
            hotel_ids: getHotelIds(user.roles),
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Authentication failed',
        });
    }
}

/**
 * Get user by Firebase UID with their roles
 */
async function getUserByFirebaseUid(
    firebaseUid: string
): Promise<UserWithRoles | null> {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', firebaseUid)
        .is('deleted_at', null)
        .single();

    if (userError || !user) {
        return null;
    }

    const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

    if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return null;
    }

    return {
        ...user,
        roles: roles || [],
    } as UserWithRoles;
}

/**
 * Get the highest role from user's role assignments
 */
function getHighestRole(roles: UserRoleAssignment[]): UserRole {
    if (roles.length === 0) {
        return 'CUSTOMER';
    }

    const roleHierarchy: Record<UserRole, number> = {
        SUPER_ADMIN: 0,
        HOTEL_ADMIN: 1,
        DUTY_MANAGER: 2,
        RECEPTION: 3,
        HOUSEKEEPING: 4,
        ACCOUNTS: 5,
        CUSTOMER: 6,
    };

    let highestRole: UserRole = 'CUSTOMER';
    let highestLevel = 6;

    for (const assignment of roles) {
        const level = roleHierarchy[assignment.role];
        if (level < highestLevel) {
            highestLevel = level;
            highestRole = assignment.role;
        }
    }

    return highestRole;
}

/**
 * Get all hotel IDs the user has access to
 */
function getHotelIds(roles: UserRoleAssignment[]): string[] {
    const hotelIds = new Set<string>();

    for (const role of roles) {
        if (role.hotel_id) {
            hotelIds.add(role.hotel_id);
        }
    }

    return Array.from(hotelIds);
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuthenticate(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return; // Continue without authentication
    }

    try {
        const token = authHeader.substring(7);
        const decodedToken = await verifyFirebaseToken(token);

        if (decodedToken) {
            const user = await getUserByFirebaseUid(decodedToken.uid);
            if (user && user.is_active) {
                request.user = {
                    id: user.id,
                    firebase_uid: user.firebase_uid,
                    email: user.email,
                    full_name: user.full_name,
                    roles: user.roles,
                    highest_role: getHighestRole(user.roles),
                    hotel_ids: getHotelIds(user.roles),
                };
            }
        }
    } catch (error) {
        // Silently continue without authentication
        console.warn('Optional auth failed:', error);
    }
}

/**
 * Role-based authorization middleware
 * Use after authenticate middleware
 */
export function requireRole(allowedRoles: UserRole[]) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if (!request.user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        const userRoles = request.user.roles.map((r) => r.role);
        const hasRole = allowedRoles.some((role) => userRoles.includes(role));

        // SUPER_ADMIN has access to everything
        if (userRoles.includes('SUPER_ADMIN')) {
            return;
        }

        if (!hasRole) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            });
        }
    };
}
