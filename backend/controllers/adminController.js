
const pool = require('../config/db');

exports.getAuditLogs = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getPopularCourses = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vw_popular_courses');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getTopSkills = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fn_top_skills()');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
