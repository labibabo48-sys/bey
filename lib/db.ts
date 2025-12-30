import { Pool } from 'pg';

// Singleton pattern to prevent multiple pools in development
let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
} else {
    if (!(global as any).pgPool) {
        (global as any).pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20, // Lowered but still enough for parallel recompute
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }
    pool = (global as any).pgPool;
}

// Increase max listeners to prevent warning
pool.setMaxListeners(10);

// Handle errors
pool.on('error', (err: Error) => {
    console.error('Database pool error:', err);
});

// Log connection stats periodically in development
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
    }, 30000); // Every 30 seconds
}

export default pool;
