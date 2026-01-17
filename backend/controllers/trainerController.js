
const pool = require('../config/db');

exports.addCourse = async (req, res) => {
    const { title, description, duration_days, mode, fee, skill_ids } = req.body;
    // Trainer ID should be fetched from user.id (which is user_id) mapping to trainer_id
    // But our JWT has user_id. We need to find trainer_id.
    const userId = req.user.id;

    try {
        const trainerRes = await pool.query('SELECT trainer_id FROM trainer_profile WHERE user_id = $1', [userId]);
        if (trainerRes.rows.length === 0) {
            return res.status(404).json({ message: 'Trainer profile not found' });
        }
        const trainerId = trainerRes.rows[0].trainer_id;

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

        // Use the view vw_course_enrollments
        const result = await pool.query('SELECT * FROM vw_course_enrollments WHERE trainer_id = $1', [trainerId]);
        res.json(result.rows);
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
    const { skill_name, category } = req.body;
    try {
        // Check if exists
        const exists = await pool.query('SELECT * FROM skill WHERE skill_name = $1', [skill_name]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ message: 'Skill already exists', skill: exists.rows[0] });
        }

        const result = await pool.query(
            'INSERT INTO skill (skill_name, category) VALUES ($1, $2) RETURNING *',
            [skill_name, category || 'Uncategorized']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
