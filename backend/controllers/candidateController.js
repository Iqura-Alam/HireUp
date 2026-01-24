const pool = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const candidateId = req.user.id;
        // The function returns a single JSON object
        const result = await pool.query('SELECT sp_generate_candidate_report($1) as report', [candidateId]);

        if (result.rows.length > 0) {
            res.json(result.rows[0].report);
        } else {
            res.status(404).json({ message: 'Profile not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.listSkills = async (req, res) => {
    try {
        const result = await pool.query('SELECT skill_id, skill_name, type FROM skill ORDER BY skill_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.addSkill = async (req, res) => {
    const { skill_id, proficiency, years_experience, custom_name } = req.body;
    const candidateId = req.user.id;

    if (proficiency === undefined) {
        return res.status(400).json({ message: 'Proficiency is required' });
    }

    // Validate Years
    if (years_experience && (years_experience < 0 || years_experience > 50)) {
        return res.status(400).json({ message: 'Invalid years of experience' });
    }

    try {
        await pool.query(
            'CALL sp_add_candidate_skill($1, $2, $3, $4, $5)',
            [candidateId, skill_id || 0, proficiency, years_experience || 0, custom_name || null]
        );
        res.status(200).json({ message: 'Skill added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
