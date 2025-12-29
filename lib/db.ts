import { Pool } from 'pg';

const getPoolConfig = () => {
    const cs = process.env.DATABASE_URL;
    if (!cs) return {};

    try {
        // Use modern WHATWG URL API which handles multiple @ symbols correctly (by taking the LAST one as host)
        // This is the recommended replacement for the deprecated url.parse()
        const url = new URL(cs);

        const config: any = {
            user: url.username ? decodeURIComponent(url.username) : undefined,
            password: url.password ? decodeURIComponent(url.password) : undefined,
            host: url.hostname,
            port: url.port ? parseInt(url.port) : 5432,
            database: url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname,
        };

        // Only add SSL if specifically requested in the URL (original behavior)
        if (cs.includes('ssl=true') || cs.includes('sslmode=require')) {
            config.ssl = { rejectUnauthorized: false };
        }

        return config;
    } catch (err) {
        // Final fallback to connectionString if URL parsing fails
        return { connectionString: cs };
    }
};

// Avoid creating multiple pools in development due to hot reloading
const pool = (global as any).pgPool || new Pool(getPoolConfig());

if (process.env.NODE_ENV !== 'production') {
    (global as any).pgPool = pool;
}

export default pool;
