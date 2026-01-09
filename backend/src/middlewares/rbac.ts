import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, ROLE_HIERARCHY } from '../types/index.js';
import { AuthenticatedUser } from './auth.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Enforces role hierarchy and hotel-level isolation
 */

/**
 * Check if user has at least the required role level
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user has access to a specific hotel
 */
export function hasHotelAccess(user: AuthenticatedUser, hotelId: string): boolean {
    // Super admin has access to all hotels
    if (user.highest_role === 'SUPER_ADMIN') {
        return true;
    }

    // Customers have access to public hotel data (no specific hotel assignment)
    if (user.highest_role === 'CUSTOMER') {
        return true;
    }

    // Other roles must have explicit hotel assignment
    return user.hotel_ids.includes(hotelId);
}

/**
 * Check if user has a specific role for a specific hotel
 */
export function hasRoleForHotel(
    user: AuthenticatedUser,
    requiredRole: UserRole,
    hotelId?: string
): boolean {
    // Super admin can do anything
    if (user.highest_role === 'SUPER_ADMIN') {
        return true;
    }

    // Check if user has the role (or higher) for the specific hotel
    for (const roleAssignment of user.roles) {
        const hasRole = hasMinimumRole(roleAssignment.role, requiredRole);
        const matchesHotel = !hotelId || roleAssignment.hotel_id === hotelId;

        if (hasRole && matchesHotel) {
            return true;
        }
    }

    return false;
}

/**
 * Middleware factory for requiring minimum role
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const user = request.user;

        if (!user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        // Check if user has any of the allowed roles (or higher)
        const hasPermission = allowedRoles.some((role) =>
            hasMinimumRole(user.highest_role, role)
        );

        if (!hasPermission) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
            });
        }
    };
}

/**
 * Middleware factory for requiring hotel-specific role
 * Gets hotelId from request params, query, or body
 */
export function requireHotelRole(...allowedRoles: UserRole[]) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const user = request.user;

        if (!user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        // Extract hotel ID from various sources
        const params = request.params as Record<string, string>;
        const query = request.query as Record<string, string>;
        const body = request.body as Record<string, unknown>;

        const hotelId =
            params.hotelId ||
            params.hotel_id ||
            query.hotelId ||
            query.hotel_id ||
            body?.hotel_id as string ||
            body?.hotelId as string;

        if (!hotelId) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Hotel ID is required',
            });
        }

        // Super admin bypass
        if (user.highest_role === 'SUPER_ADMIN') {
            return;
        }

        // Check if user has any of the allowed roles for this hotel
        const hasPermission = allowedRoles.some((role) =>
            hasRoleForHotel(user, role, hotelId)
        );

        if (!hasPermission) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `Insufficient permissions for hotel ${hotelId}`,
            });
        }
    };
}

/**
 * Middleware to ensure user can only access their own resources
 * or has staff/admin access
 */
export function requireOwnerOrStaff(userIdField: string = 'userId') {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const user = request.user;

        if (!user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        // Staff and above can access any user's resources
        if (hasMinimumRole(user.highest_role, 'RECEPTION')) {
            return;
        }

        // Get resource owner ID from params or query
        const params = request.params as Record<string, string>;
        const query = request.query as Record<string, string>;
        const resourceUserId = params[userIdField] || query[userIdField];

        // If no specific user ID, allow (resource will be filtered by user)
        if (!resourceUserId) {
            return;
        }

        // Check if user is accessing their own resource
        if (resourceUserId !== user.id) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'You can only access your own resources',
            });
        }
    };
}

/**
 * Helper to get hotel IDs user can access for queries
 */
export function getAccessibleHotelIds(user: AuthenticatedUser): string[] | 'all' {
    if (user.highest_role === 'SUPER_ADMIN') {
        return 'all';
    }
    return user.hotel_ids;
}

/**
 * Permission definitions for actions
 */
export const PERMISSIONS = {
    // Hotel management
    HOTEL_CREATE: ['SUPER_ADMIN'] as UserRole[],
    HOTEL_UPDATE: ['SUPER_ADMIN', 'HOTEL_ADMIN'] as UserRole[],
    HOTEL_DELETE: ['SUPER_ADMIN'] as UserRole[],

    // Room management
    ROOM_CREATE: ['HOTEL_ADMIN'] as UserRole[],
    ROOM_UPDATE: ['HOTEL_ADMIN', 'DUTY_MANAGER'] as UserRole[],
    ROOM_DELETE: ['HOTEL_ADMIN'] as UserRole[],
    ROOM_STATUS_UPDATE: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION', 'HOUSEKEEPING'] as UserRole[],

    // Booking management
    BOOKING_VIEW_ALL: ['SUPER_ADMIN', 'HOTEL_ADMIN', 'DUTY_MANAGER', 'RECEPTION'] as UserRole[],
    BOOKING_CREATE: ['CUSTOMER', 'RECEPTION'] as UserRole[],
    BOOKING_CHECK_IN: ['RECEPTION', 'DUTY_MANAGER'] as UserRole[],
    BOOKING_CHECK_OUT: ['RECEPTION', 'DUTY_MANAGER'] as UserRole[],
    BOOKING_CANCEL: ['HOTEL_ADMIN', 'DUTY_MANAGER'] as UserRole[],

    // Payment management
    PAYMENT_VERIFY: ['RECEPTION', 'DUTY_MANAGER', 'ACCOUNTS'] as UserRole[],
    PAYMENT_VIEW_ALL: ['HOTEL_ADMIN', 'ACCOUNTS'] as UserRole[],

    // Staff management
    STAFF_VIEW: ['HOTEL_ADMIN'] as UserRole[],
    STAFF_CREATE: ['HOTEL_ADMIN'] as UserRole[],
    STAFF_UPDATE: ['HOTEL_ADMIN'] as UserRole[],
    STAFF_DELETE: ['HOTEL_ADMIN'] as UserRole[],

    // Pricing management
    PRICING_VIEW: ['HOTEL_ADMIN', 'DUTY_MANAGER'] as UserRole[],
    PRICING_UPDATE: ['HOTEL_ADMIN'] as UserRole[],

    // Coupon management
    COUPON_VIEW: ['HOTEL_ADMIN', 'DUTY_MANAGER'] as UserRole[],
    COUPON_CREATE: ['HOTEL_ADMIN'] as UserRole[],
    COUPON_UPDATE: ['HOTEL_ADMIN'] as UserRole[],

    // Reports
    REPORTS_VIEW: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'ACCOUNTS'] as UserRole[],

    // Housekeeping
    HOUSEKEEPING_VIEW: ['HOTEL_ADMIN', 'DUTY_MANAGER', 'HOUSEKEEPING'] as UserRole[],
    HOUSEKEEPING_UPDATE: ['HOUSEKEEPING'] as UserRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;
