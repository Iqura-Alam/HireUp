const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runSql() {
    try {
        // 1. Run alter_employer.sql
        const alterPath = path.join(__dirname, '../database/alter_employer.sql');
        const alterSql = fs.readFileSync(alterPath, 'utf8');
        await pool.query(alterSql);
        console.log('Successfully executed alter_employer.sql');

        // 2. Reload procedures.sql
        const procPath = path.join(__dirname, '../database/procedures.sql');
        const procSql = fs.readFileSync(procPath, 'utf8');
        await pool.query(procSql);
        console.log('Successfully reloaded procedures.sql');

    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await pool.end();
    }
}

runSql();
