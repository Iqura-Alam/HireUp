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

exports.getAllJobs = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT j.*, e.company_name, e.industry, e.location as company_location,
            (
                SELECT jsonb_agg(s.skill_name)
                FROM job_requirement jr
                JOIN skill s ON s.skill_id = jr.skill_id
                WHERE jr.job_id = j.job_id
            ) as required_skills,
            CASE WHEN a.application_id IS NOT NULL THEN TRUE ELSE FALSE END as is_applied
            FROM job j
            JOIN employer e ON e.employer_id = j.employer_id
            LEFT JOIN application a ON a.job_id = j.job_id AND a.candidate_id = (SELECT candidate_id FROM candidate_profile WHERE candidate_id = $1)
            WHERE j.status = 'Open' AND j.expires_at >= CURRENT_DATE
            ORDER BY j.created_at DESC
        `, [req.user.id]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.applyForJob = async (req, res) => {
    const { jobId } = req.params;
    const userId = req.user.id;
    const cvFile = req.file ? req.file.buffer : null;

    // Parse answers from body (might be stringified JSON if sent via FormData)
    let answers = [];
    let questionIds = [];

    if (req.body.answers) {
        try {
            const parsedAnswers = JSON.parse(req.body.answers);
            // Expecting array of { question_id, answer_text }
            questionIds = parsedAnswers.map(a => parseInt(a.question_id));
            answers = parsedAnswers.map(a => a.answer_text);
        } catch (e) {
            console.error('Error parsing answers', e);
        }
    }

    try {
        if (!cvFile) {
            return res.status(400).json({ message: 'CV upload is required' });
        }

        await pool.query(
            'CALL sp_apply_for_job_custom($1, $2, $3, $4, $5)',
            [parseInt(userId), parseInt(jobId), cvFile, questionIds.length ? questionIds : null, answers.length ? answers : null]
        );
        res.json({ message: 'Applied successfully' });
    } catch (error) {
        console.error('Apply Job Error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Already applied to this job' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getJobDetails = async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await pool.query(`
            SELECT j.*, e.company_name,
            (SELECT jsonb_agg(
                jsonb_build_object('question_id', jq.question_id, 'question_text', jq.question_text)
            ) FROM job_question jq WHERE jq.job_id = j.job_id) as questions
            FROM job j
            JOIN employer e ON e.employer_id = j.employer_id
            WHERE j.job_id = $1
        `, [jobId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllCourses = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, tp.organization_name as trainer_name,
            (
                SELECT jsonb_agg(s.skill_name)
                FROM course_skill cs
                JOIN skill s ON s.skill_id = cs.skill_id
                WHERE cs.course_id = c.course_id
            ) as skills_taught,
            CASE WHEN e.enrollment_id IS NOT NULL THEN TRUE ELSE FALSE END as is_enrolled
            FROM course c
            JOIN trainer_profile tp ON tp.trainer_id = c.trainer_id
            LEFT JOIN enrollment e ON e.course_id = c.course_id AND e.candidate_id = (SELECT candidate_id FROM candidate_profile WHERE candidate_id = $1)
            ORDER BY c.created_at DESC
        `, [req.user.id]);



        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.enrollInCourse = async (req, res) => {
    const { courseId } = req.params;
    const candidateId = req.user.id;

    try {
        await pool.query('CALL sp_enroll_course($1, $2)', [parseInt(candidateId), parseInt(courseId)]);
        res.status(200).json({ message: 'Enrolled successfully' });
    } catch (error) {
        console.error('Enroll Error:', error);
        if (error.code === 'P0001' || error.message.includes('already enrolled')) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
