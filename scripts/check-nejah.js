
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const res = await pool.query('SELECT user_id, username, dim, lun, mar, mer, jeu, ven, sam FROM public.user_schedules WHERE user_id = 36');
    if (res.rows.length > 0) {
        console.log('Schedule for Nejah Briki (36):', res.rows[0]);
    } else {
        console.log('No schedule found for user 36');
    }
    await pool.end();
}

check();
