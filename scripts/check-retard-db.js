
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const date = '2026-01-02';
    const res = await pool.query(`SELECT * FROM public.retards WHERE user_id = 36 AND date >= $1::date AND date < ($1::date + '1 day'::interval)`, [date]);
    console.log('Retards for user 36 on 2026-01-02:', res.rows);
    await pool.end();
}

check();
