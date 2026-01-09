import { z } from 'zod';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';

dotenv.config();

const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),

    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Firebase - can use either individual vars or credentials file
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CREDENTIALS_PATH: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),

    // UPI Payment
    UPI_MERCHANT_ID: z.string().min(1),
    UPI_MERCHANT_NAME: z.string().min(1),
    PAYMENT_SESSION_EXPIRY_MINUTES: z.string().transform(Number).default('5'),

    // Tax
    GST_PERCENTAGE: z.string().transform(Number).default('18'),

    // CORS
    ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

// Load Firebase credentials from file if path is provided
let firebaseCredentials: { private_key: string; client_email: string } | null = null;

if (parsed.data.FIREBASE_CREDENTIALS_PATH && existsSync(parsed.data.FIREBASE_CREDENTIALS_PATH)) {
    try {
        const content = readFileSync(parsed.data.FIREBASE_CREDENTIALS_PATH, 'utf-8');
        firebaseCredentials = JSON.parse(content);
    } catch (error) {
        console.error('Failed to load Firebase credentials file');
    }
}

// Helper to safely format private key
const formatPrivateKey = (key: string) => {
    return key.replace(/\\n/g, '\n');
};

export const env = {
    ...parsed.data,
    FIREBASE_PRIVATE_KEY: formatPrivateKey(parsed.data.FIREBASE_PRIVATE_KEY || firebaseCredentials?.private_key || ''),
    FIREBASE_CLIENT_EMAIL: parsed.data.FIREBASE_CLIENT_EMAIL || firebaseCredentials?.client_email || '',
};

