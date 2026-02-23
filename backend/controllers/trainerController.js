
const pool = require('../config/db');

// ── Trainer Profile ──────────────────────────────────

exports.getProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT tp.trainer_id, tp.organization_name, tp.specialization, tp.contact_number,
                   tp.is_verified, u.username, u.email
            FROM trainer_profile tp
            JOIN users u ON u.user_id = tp.user_id
            WHERE tp.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Trainer profile not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { organization_name, specialization, contact_number } = req.body;
    try {
        await pool.query(
            'CALL sp_update_trainer_profile($1, $2, $3, $4)',
            [userId, organization_name || null, specialization || null, contact_number || null]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getPublicTrainerProfile = async (req, res) => {
    const { id } = req.params; // trainer_id
    try {
        const result = await pool.query(`
            SELECT tp.trainer_id, tp.organization_name, tp.specialization, tp.contact_number,
                   tp.is_verified, u.username, u.email
            FROM trainer_profile tp
            JOIN users u ON u.user_id = tp.user_id
            WHERE tp.trainer_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }

        const trainer = result.rows[0];

        // Get their courses
        const courses = await pool.query(`
            SELECT c.title, c.description, c.duration_days, c.mode, c.fee,
                   (SELECT COUNT(*) FROM enrollment e WHERE e.course_id = c.course_id) as enrolled_count
            FROM course c
            WHERE c.trainer_id = $1
            ORDER BY c.created_at DESC
        `, [id]);

        trainer.courses = courses.rows;
        res.json(trainer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── Courses ──────────────────────────────────────────

exports.addCourse = async (req, res) => {
    const { title, description, duration_days, mode, fee, skill_ids, prereq_ids } = req.body;
    // Trainer ID should be fetched from user.id (which is user_id) mapping to trainer_id
    // But our JWT has user_id. We need to find trainer_id.
    const userId = req.user.id;

    try {
        const trainerRes = await pool.query('SELECT trainer_id, is_verified FROM trainer_profile WHERE user_id = $1', [userId]);
        if (trainerRes.rows.length === 0) {
            return res.status(404).json({ message: 'Trainer profile not found' });
        }

        const { trainer_id: trainerId, is_verified } = trainerRes.rows[0];

        if (!is_verified) {
            return res.status(403).json({ message: 'Your account is pending admin verification. You cannot create courses yet.' });
        }

        await pool.query(
            'CALL sp_add_course($1, $2, $3, $4, $5, $6, $7)',
            [trainerId, title, description, duration_days, mode, fee, skill_ids]
        );

        res.status(201).json({ message: 'Course created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


exports.getTrainerCourses = async (req, res) => {
    const userId = req.user.id;
    try {
        const trainerRes = await pool.query('SELECT trainer_id FROM trainer_profile WHERE user_id = $1', [userId]);
        if (trainerRes.rows.length === 0) return res.status(404).json({ message: 'Trainer not found' });
        const trainerId = trainerRes.rows[0].trainer_id;

        const result = await pool.query(`
            SELECT c.*, 
            (SELECT COUNT(*) FROM enrollment e WHERE e.course_id = c.course_id) as enrolled_count
            FROM course c 
            WHERE c.trainer_id = $1
            ORDER BY c.created_at DESC
        `, [trainerId]);

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getCourseEnrollments = async (req, res) => {
    const userId = req.user.id;
    try {
        const trainerRes = await pool.query('SELECT trainer_id FROM trainer_profile WHERE user_id = $1', [userId]);
        if (trainerRes.rows.length === 0) return res.status(404).json({ message: 'Trainer not found' });
        const trainerId = trainerRes.rows[0].trainer_id;

        const result = await pool.query(`
            SELECT 
                e.enrollment_id, 
                e.status, 
                e.completion_status,
                e.enrolled_at,
                c.title as course_title,
                u.username as candidate_name,
                u.email as candidate_email,
                cp.contact_number as candidate_phone
            FROM enrollment e
            JOIN course c ON e.course_id = c.course_id
            JOIN candidate_profile cp ON e.candidate_id = cp.candidate_id
            JOIN users u ON cp.candidate_id = u.user_id
            WHERE c.trainer_id = $1
            ORDER BY e.enrolled_at DESC
        `, [trainerId]);
        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateCourse = async (req, res) => {
    const { id } = req.params;
    const { title, description, duration_days, mode, fee, skill_ids } = req.body;
    try {
        await pool.query(
            'CALL sp_update_course($1, $2, $3, $4, $5, $6, $7)',
            [id, title, description, duration_days, mode, fee, skill_ids]
        );
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteCourse = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('CALL sp_delete_course($1)', [id]);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.manageEnrollment = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Shortlisted' (Approve), 'Rejected'
    try {
        await pool.query('CALL sp_manage_enrollment($1, $2)', [id, status]);
        res.json({ message: `Enrollment ${status.toLowerCase()} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


exports.completeCourse = async (req, res) => {
    const { enrollment_id } = req.body;
    try {
        await pool.query('CALL sp_complete_course($1)', [enrollment_id]);
        res.json({ message: 'Course marked as completed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getSkills = async (req, res) => {
    try {
        const result = await pool.query('SELECT skill_id, skill_name FROM skill ORDER BY skill_name');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.addSkill = async (req, res) => {
    const { skill_name } = req.body;
    try {
        const slug = skill_name.toLowerCase().replace(/\s+/g, '-');
        // Check if exists
        const exists = await pool.query('SELECT * FROM skill WHERE skill_name = $1 OR skill_slug = $2', [skill_name, slug]);
        if (exists.rows.length > 0) {
            return res.status(200).json(exists.rows[0]);
        }

        const result = await pool.query(
            'INSERT INTO skill (skill_name, skill_slug) VALUES ($1, $2) RETURNING *',
            [skill_name, slug]
        );
        res.status(201).json(result.rows[0]);
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

