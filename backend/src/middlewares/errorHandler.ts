import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

interface ErrorResponse {
    error: string;
    message: string;
    details?: unknown;
    stack?: string;
}

/**
 * Global error handler for Fastify
 */
export function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): void {
    const response: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
    };

    let statusCode = error.statusCode || 500;

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        statusCode = 400;
        response.error = 'Validation Error';
        response.message = 'Invalid request data';
        response.details = error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));
    }
    // Handle Fastify validation errors
    else if (error.validation) {
        statusCode = 400;
        response.error = 'Validation Error';
        response.message = 'Invalid request data';
        response.details = error.validation;
    }
    // Handle not found errors
    else if (statusCode === 404) {
        response.error = 'Not Found';
        response.message = error.message || 'Resource not found';
    }
    // Handle unauthorized errors
    else if (statusCode === 401) {
        response.error = 'Unauthorized';
        response.message = error.message || 'Authentication required';
    }
    // Handle forbidden errors
    else if (statusCode === 403) {
        response.error = 'Forbidden';
        response.message = error.message || 'Access denied';
    }
    // Handle rate limit errors
    else if (statusCode === 429) {
        response.error = 'Too Many Requests';
        response.message = error.message || 'Rate limit exceeded';
    }
    // Handle conflict errors
    else if (statusCode === 409) {
        response.error = 'Conflict';
        response.message = error.message || 'Resource conflict';
    }
    // Handle all other errors
    else {
        response.message = error.message || 'An unexpected error occurred';

        // Include stack trace in development
        if (env.NODE_ENV === 'development') {
            response.stack = error.stack;
        }
    }

    // Log the error
    if (statusCode >= 500) {
        request.log.error(error, 'Server error');
    } else {
        request.log.warn(error, 'Client error');
    }

    reply.status(statusCode).send(response);
}

/**
 * Custom error classes
 */
export class AppError extends Error {
    statusCode: number;
    details?: unknown;

    constructor(message: string, statusCode: number = 500, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        super(id ? `${resource} with ID ${id} not found` : `${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, details);
        this.name = 'ValidationError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

/**
 * Not found handler for 404 routes
 */
export function notFoundHandler(
    request: FastifyRequest,
    reply: FastifyReply
): void {
    reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
    });
}
