import { Pool } from 'pg';

const getPoolConfig = () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return {};

    try {
        const dbUrl = new URL(connectionString);
        return {
            user: dbUrl.username,
            password: dbUrl.password,
            host: dbUrl.hostname,
            port: parseInt(dbUrl.port || '5432'),
            database: dbUrl.pathname.split('/')[1],
            ssl: connectionString.includes('sslmode=require') || connectionString.includes('ssl=true') ? { rejectUnauthorized: false } : false
        };
    } catch (e) {
        // Fallback to connectionString if URL parsing fails
        return { connectionString };
    }
};

const poolConfig = getPoolConfig();

// Avoid creating multiple pools in development due to hot reloading
const pool = (global as any).pgPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
    (global as any).pgPool = pool;
}

export default pool;
