import { Pool } from 'pg';

const createPool = () => {
    // Singleton pattern to prevent multiple pools in development
    if (typeof global !== 'undefined') {
        if (!(global as any).pgPool) {
            (global as any).pgPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                max: process.env.NODE_ENV === 'production' ? 20 : 5, // Lower limit in dev
                idleTimeoutMillis: 10000,
                connectionTimeoutMillis: 5000,
            });
            console.log('[Database] New pool created');
        }
        return (global as any).pgPool as Pool;
    }

    // Fallback for non-global environments (rare in Next.js server)
    return new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
    });
};

export default createPool;
