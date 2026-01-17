
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runSchema() {
    try {
        const files = ['tables.sql', 'procedures.sql', 'triggers.sql', 'views.sql'];

        for (const file of files) {
            const sqlPath = path.join(__dirname, '../database', file);
            const sql = fs.readFileSync(sqlPath, 'utf8');
            console.log(`Applying ${file}...`);
            await pool.query(sql);
            console.log(`Successfully applied ${file}`);
        }

    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await pool.end();
    }
}

runSchema();
