import { Pool } from 'pg';

/**
 * DATABASE CONNECTION POOL SINGLETON
 * 
 * Optimized for low max_connections (current limit: 50) and multiple concurrent users.
 */

declare global {
    var pgPool: Pool | undefined;
}

const isProd = process.env.NODE_ENV === 'production';

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Keep max connections low per instance to allow multiple developers/users
    // (Total server limit is 50, so Max 4 per dev instance is much safer)
    max: isProd ? 30 : 4,
    // Release idle connections very quickly to free up slots for other users
    idleTimeoutMillis: 2000,
    // Faster timeout if connection cannot be established
    connectionTimeoutMillis: 5000,
    // Recycle connections faster to be safe
    maxUses: 1000,
};

// Singleton initialization
const pool = global.pgPool || new Pool(poolConfig);

if (!isProd) {
    global.pgPool = pool;
}

// Error handling
pool.on('error', (err: Error) => {
    console.error('[Database] Unexpected pool error:', err);
});

export default () => pool;
