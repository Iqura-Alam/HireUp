
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

exports.getPendingUsers = async (req, res) => {
    try {
        const employers = await pool.query(`
            SELECT e.employer_id as id, u.email, u.username, e.company_name as name, 'Employer' as role, e.created_at
            FROM employer e
            JOIN users u ON u.user_id = e.user_id
            WHERE e.is_verified = FALSE AND u.is_active = TRUE
        `);

        const trainers = await pool.query(`
            SELECT t.trainer_id as id, u.email, u.username, t.organization_name as name, 'Trainer' as role, t.created_at
            FROM trainer_profile t
            JOIN users u ON u.user_id = t.user_id
            WHERE t.is_verified = FALSE AND u.is_active = TRUE
        `);

        res.json([...employers.rows, ...trainers.rows]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.verifyUser = async (req, res) => {
    const { role, id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    try {
        if (action === 'approve') {
            if (role === 'Employer') {
                await pool.query('UPDATE employer SET is_verified = TRUE WHERE employer_id = $1', [id]);
            } else if (role === 'Trainer') {
                await pool.query('UPDATE trainer_profile SET is_verified = TRUE WHERE trainer_id = $1', [id]);
            }
            res.json({ message: `${role} approved successfully` });
        } else if (action === 'reject') {
            // Soft delete user and associated profile
            let userIdQuery;
            if (role === 'Employer') {
                userIdQuery = await pool.query('SELECT user_id FROM employer WHERE employer_id = $1', [id]);
            } else if (role === 'Trainer') {
                userIdQuery = await pool.query('SELECT user_id FROM trainer_profile WHERE trainer_id = $1', [id]);
            }

            if (userIdQuery.rows.length > 0) {
                const userId = userIdQuery.rows[0].user_id;
                await pool.query('UPDATE users SET is_active = FALSE, deleted_at = NOW() WHERE user_id = $1', [userId]);
            }
            res.json({ message: `${role} rejected and deactivated successfully` });
        } else {
            res.status(400).json({ message: 'Invalid action' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.verifyAllPending = async (req, res) => {
    try {
        await pool.query('UPDATE employer SET is_verified = TRUE WHERE is_verified = FALSE');
        await pool.query('UPDATE trainer_profile SET is_verified = TRUE WHERE is_verified = FALSE');
        res.json({ message: 'All pending accounts approved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT user_id, username, email, role, account_status, is_active, created_at 
            FROM users 
            WHERE deleted_at IS NULL AND role != 'Admin'
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Active', 'Suspended', 'Banned'

    try {
        const isActive = (status === 'Active');
        await pool.query(
            'UPDATE users SET account_status = $1, is_active = $2, updated_at = NOW() WHERE user_id = $3',
            [status, isActive, id]
        );
        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            'UPDATE users SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW() WHERE user_id = $1',
            [id]
        );
        res.json({ message: 'User soft-deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
