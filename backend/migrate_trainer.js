

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runSql() {
    try {
        const sqlPath = path.join(__dirname, '../database/trainer_admin_module.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log('Successfully executed trainer_admin_module.sql');
    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await pool.end();
    }
}

runSql();
