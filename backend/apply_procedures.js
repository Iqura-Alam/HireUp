const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function applyProcedures() {
    try {
        const sqlPath = path.join(__dirname, '../database/procedures.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying procedures...');
        await pool.query(sql);
        console.log('Procedures applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying procedures:', err);
        process.exit(1);
    }
}

applyProcedures();
