import { Pool } from 'pg';

const pool = (global as any).pgPool || new Pool({
    connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') {
    (global as any).pgPool = pool;
}

export default pool;
