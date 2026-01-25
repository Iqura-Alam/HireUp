const pool = require('../config/db');

// Helper to get employer_id from user_id
const getEmployerId = async (userId) => {
    const result = await pool.query('SELECT employer_id FROM employer WHERE user_id = $1', [userId]);
    return result.rows.length ? result.rows[0].employer_id : null;
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`
            SELECT e.*, u.username, u.email 
            FROM employer e
            JOIN users u ON u.user_id = e.user_id
            WHERE e.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employer profile not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { company_name, industry, location, contact_number, website } = req.body;

        await pool.query(
            `CALL sp_update_employer_profile($1, $2, $3, $4, $5, $6)`,
            [userId, company_name, industry, location, contact_number, website]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.postJob = async (req, res) => {
    try {
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);
        if (!employerId) return res.status(404).json({ message: 'Employer not found' });

        const { title, description, location, salary_range, expires_at, skill_ids, min_proficiencies, questions } = req.body;

        await pool.query(
            `CALL sp_post_job($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [employerId, title, description, location, salary_range, expires_at, skill_ids || [], min_proficiencies || [], questions || []]
        );

        res.status(201).json({ message: 'Job posted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getJobs = async (req, res) => {
    try {
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);

        const result = await pool.query(`
            SELECT j.*, 
            (SELECT COUNT(*) FROM application a WHERE a.job_id = j.job_id) as application_count
            FROM job j
            WHERE j.employer_id = $1
            ORDER BY j.created_at DESC
        `, [employerId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);

        // Verify ownership
        const jobCheck = await pool.query('SELECT 1 FROM job WHERE job_id = $1 AND employer_id = $2', [jobId, employerId]);
        if (jobCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const result = await pool.query(`
            SELECT a.application_id, a.status, a.applied_at,
                   u.email, u.username,
                   cp.first_name, cp.last_name, cp.full_name, cp.resume_url, cp.experience_years,
                   (
                       SELECT jsonb_agg(
                           jsonb_build_object(
                               'question_text', jq.question_text,
                               'answer_text', aa.answer_text
                           )
                       )
                       FROM application_answer aa
                       JOIN job_question jq ON jq.question_id = aa.question_id
                       WHERE aa.application_id = a.application_id
                   ) as answers
            FROM application a
            JOIN candidate_profile cp ON cp.candidate_id = a.candidate_id
            JOIN users u ON u.user_id = cp.candidate_id
            WHERE a.job_id = $1
            ORDER BY a.applied_at DESC
        `, [jobId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.shortlistApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);

        await pool.query(`CALL sp_shortlist_application($1, $2)`, [employerId, applicationId]);
        res.json({ message: 'Application shortlisted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.hireApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);

        await pool.query(`CALL sp_hire_application($1, $2)`, [employerId, applicationId]);
        res.json({ message: 'Applicant hired' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);

        await pool.query(`CALL sp_reject_application($1, $2)`, [employerId, applicationId]);
        res.json({ message: 'Applicant rejected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllSkills = async (req, res) => {
    try {
        const result = await pool.query('SELECT skill_id, skill_name, type FROM skill ORDER BY skill_name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getApplicationCV = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.user.id;
        const employerId = await getEmployerId(userId);

        // Verify authorization
        const authCheck = await pool.query(`
            SELECT 1 
            FROM application a
            JOIN job j ON j.job_id = a.job_id
            WHERE a.application_id = $1 AND j.employer_id = $2
        `, [applicationId, employerId]);

        if (authCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const result = await pool.query('SELECT cv_file FROM application WHERE application_id = $1', [applicationId]);

        if (result.rows.length === 0 || !result.rows[0].cv_file) {
            return res.status(404).json({ message: 'CV not found' });
        }

        const cvBuffer = result.rows[0].cv_file;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="application_${applicationId}.pdf"`);
        res.send(cvBuffer);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
