import { Pool } from 'pg';

// Avoid creating multiple pools in development due to hot reloading
const pool = (global as any).pgPool || new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error if connection takes longer than 10 seconds
    maxUses: 7500, // Close connections after 7500 uses to prevent memory leaks
});

if (process.env.NODE_ENV !== 'production') {
    (global as any).pgPool = pool;
}

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

export default pool;
