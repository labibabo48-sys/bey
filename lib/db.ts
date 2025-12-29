import { Pool } from 'pg';

// Avoid creating multiple pools in development due to hot reloading
const pool = (global as any).pgPool || new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Fast timeout
    statement_timeout: 10000, // 10 second query timeout
});

if (process.env.NODE_ENV !== 'production') {
    (global as any).pgPool = pool;
}

// Handle errors
pool.on('error', (err: Error) => {
    console.error('Database pool error:', err);
});

export default pool;
