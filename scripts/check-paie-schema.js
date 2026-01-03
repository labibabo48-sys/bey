
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'paiecurrent_%' LIMIT 1");
    if (tables.rows.length > 0) {
        const tableName = tables.rows[0].tablename;
        const res = await pool.query(`SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = '${tableName}'`);
        console.log(`Columns in ${tableName}:`, res.rows);
    } else {
        console.log('No paiecurrent tables found');
    }
    await pool.end();
}

check();
