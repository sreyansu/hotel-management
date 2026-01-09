import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    db: {
        schema: 'public',
    },
});

// Helper function for transactions
export async function withTransaction<T>(
    callback: (client: typeof supabase) => Promise<T>
): Promise<T> {
    // Note: Supabase JS client doesn't support native transactions
    // For complex transactions, use RPC functions or direct pg connection
    return callback(supabase);
}
