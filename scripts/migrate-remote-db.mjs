
import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = 'postgresql://postgres:CSScss110595@123do@41.231.122.71:5432/bey';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting remote database migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Ensuring static tables and columns...');

        // 1. Notifications
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.notifications (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read BOOLEAN DEFAULT FALSE,
                user_id INT,
                user_done VARCHAR(255),
                url TEXT
            )
        `);
        await client.query('ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_done VARCHAR(255)');
        await client.query('ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS url TEXT');

        // 2. Doublages
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.doublages(
                id SERIAL PRIMARY KEY,
                user_id INT,
                username VARCHAR(100),
                montant FLOAT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Cardcin
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.cardcin (
                id SERIAL PRIMARY KEY,
                user_id INT UNIQUE,
                cin_photo_front TEXT,
                cin_photo_back TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Logins
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.logins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role VARCHAR(50) NOT NULL,
                permissions JSONB
            )
        `);
        await client.query('ALTER TABLE public.logins ADD COLUMN IF NOT EXISTS permissions JSONB');

        // 5. Users
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo TEXT');
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false');
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nbmonth INT');
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cin_photo_front TEXT');
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cin_photo_back TEXT');
        await client.query('ALTER TABLE public.users ALTER COLUMN nbmonth DROP NOT NULL');
        await client.query('ALTER TABLE public.users ALTER COLUMN zktime_id DROP NOT NULL');

        // 6. User Schedules
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.user_schedules (
                id SERIAL PRIMARY KEY,
                user_id INT UNIQUE,
                username VARCHAR(100),
                dim VARCHAR(10), lun VARCHAR(10), mar VARCHAR(10), mer VARCHAR(10), jeu VARCHAR(10), ven VARCHAR(10), sam VARCHAR(10),
                is_coupure BOOLEAN DEFAULT FALSE,
                p1_in VARCHAR(10), p1_out VARCHAR(10), p2_in VARCHAR(10), p2_out VARCHAR(10)
            )
        `);
        await client.query('ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS is_coupure BOOLEAN DEFAULT FALSE');
        await client.query('ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p1_in VARCHAR(10)');
        await client.query('ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p1_out VARCHAR(10)');
        await client.query('ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p2_in VARCHAR(10)');
        await client.query('ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p2_out VARCHAR(10)');

        // 7. Extras
        await client.query('ALTER TABLE public.extras ADD COLUMN IF NOT EXISTS motif TEXT');

        // 8. Payroll Tables (paiecurrent_%)
        console.log('Finding all paiecurrent tables...');
        const tablesRes = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'paiecurrent_%'");
        const paieTables = tablesRes.rows.map(r => r.tablename);

        for (const tableName of paieTables) {
            console.log(`Updating table: ${tableName}`);
            await client.query(`ALTER TABLE public."${tableName}" ALTER COLUMN present TYPE FLOAT`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS retard INT DEFAULT 0`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS prime FLOAT DEFAULT 0`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS infraction FLOAT DEFAULT 0`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS doublage FLOAT DEFAULT 0`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS mise_a_pied FLOAT DEFAULT 0`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS clock_in VARCHAR(50)`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS clock_out VARCHAR(50)`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS updated BOOLEAN DEFAULT FALSE`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p1_in VARCHAR(50)`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p1_out VARCHAR(50)`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p2_in VARCHAR(50)`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p2_out VARCHAR(50)`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS salaire_net FLOAT DEFAULT 0`);
            await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE`);
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
