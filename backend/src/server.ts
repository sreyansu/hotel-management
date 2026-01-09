import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { authRoutes } from './routes/auth.routes.js';
import { hotelRoutes } from './routes/hotels.routes.js';
import { bookingRoutes } from './routes/bookings.routes.js';
import { couponRoutes } from './routes/coupons.routes.js';
import { pricingRoutes } from './routes/pricing.routes.js';
import { staffRoutes } from './routes/staff.routes.js';
import { reportsRoutes } from './routes/reports.routes.js';
import { paymentService } from './services/payment.service.js';

// Create Fastify instance
const fastify = Fastify({
    logger: {
        level: env.NODE_ENV === 'development' ? 'debug' : 'info',
        transport: env.NODE_ENV === 'development' ? {
            target: 'pino-pretty',
            options: { colorize: true },
        } : undefined,
    },
});

// Register plugins
async function registerPlugins(): Promise<void> {
    // CORS
    await fastify.register(cors, {
        origin: env.ALLOWED_ORIGINS,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // Security headers
    await fastify.register(helmet, {
        contentSecurityPolicy: false,
    });

    // Rate limiting
    await fastify.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        keyGenerator: (request) => {
            return request.headers['x-forwarded-for'] as string || request.ip;
        },
    });
}

// Register routes
async function registerRoutes(): Promise<void> {
    // Health check
    fastify.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    }));

    // API routes
    await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
    await fastify.register(hotelRoutes, { prefix: '/api/v1/hotels' });
    await fastify.register(bookingRoutes, { prefix: '/api/v1/bookings' });
    await fastify.register(couponRoutes, { prefix: '/api/v1/coupons' });
    await fastify.register(pricingRoutes, { prefix: '/api/v1/pricing' });
    await fastify.register(staffRoutes, { prefix: '/api/v1/staff' });
    await fastify.register(reportsRoutes, { prefix: '/api/v1/reports' });
}

// Set error handlers
function setupErrorHandlers(): void {
    fastify.setErrorHandler(errorHandler);
    fastify.setNotFoundHandler(notFoundHandler);
}

// Session cleanup job (expires old payment sessions)
function startCleanupJob(): void {
    const CLEANUP_INTERVAL = 60 * 1000; // Every minute

    setInterval(async () => {
        try {
            const expired = await paymentService.expireOldSessions();
            if (expired > 0) {
                fastify.log.info(`Expired ${expired} payment sessions`);
            }
        } catch (error) {
            fastify.log.error('Session cleanup error:', error);
        }
    }, CLEANUP_INTERVAL);
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
    fastify.log.info(`Received ${signal}. Shutting down gracefully...`);

    try {
        await fastify.close();
        fastify.log.info('Server closed successfully');
        process.exit(0);
    } catch (error) {
        fastify.log.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Main startup
async function start(): Promise<void> {
    try {
        await registerPlugins();
        await registerRoutes();
        setupErrorHandlers();

        await fastify.listen({
            port: env.PORT,
            host: '0.0.0.0',
        });

        fastify.log.info(`
🏨 Hotel Management API Server
================================
Environment: ${env.NODE_ENV}
Port: ${env.PORT}
API Base: http://localhost:${env.PORT}/api/v1
Health: http://localhost:${env.PORT}/health
================================
    `);

        // Start cleanup job in production
        if (env.NODE_ENV === 'production') {
            startCleanupJob();
        }

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        fastify.log.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
