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
    const { skill_name, proficiency, years_experience, custom_name } = req.body;
    const candidateId = req.user.id;

    if (!skill_name) {
        return res.status(400).json({ message: 'Skill name is required' });
    }

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
            [candidateId, skill_name, proficiency, years_experience || 0, custom_name || null]
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
            SELECT j.*, e.company_name, e.industry, e.location as company_location, e.website as company_website,
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
            SELECT j.*, e.company_name, e.website as company_website,
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


// ==========================================
// NEW: Profile Management Endpoints
// ==========================================

// Optimized Dashboard Context
exports.getDashboardContext = async (req, res) => {
    try {
        const candidateId = req.user.id;

        // 1. Get Full Profile (Reuse existing View)
        const profileQuery = await pool.query('SELECT * FROM vw_candidate_full_profile WHERE user_id = $1', [candidateId]);
        const profile = profileQuery.rows[0];

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // 2. Fetch specialized lists (Experience, Education, Projects) 
        // Note: Creating simple views for these or querying tables directly would be faster 
        // but for now, we query tables directly as they are standardized.
        const expQuery = await pool.query('SELECT * FROM candidate_experience WHERE candidate_id = $1 ORDER BY start_date DESC', [candidateId]);
        const eduQuery = await pool.query('SELECT * FROM candidate_education WHERE candidate_id = $1 ORDER BY start_date DESC', [candidateId]);
        const projQuery = await pool.query('SELECT * FROM candidate_project WHERE candidate_id = $1 ORDER BY start_date DESC', [candidateId]);

        // 3. Get Completion Percentage
        const statusQuery = await pool.query('SELECT completion_percentage FROM candidate_profile WHERE candidate_id = $1', [candidateId]);
        const completion = statusQuery.rows[0] ? statusQuery.rows[0].completion_percentage : 0;

        // 4. Calculate Missing Sections logic (Dynamic suggestion)
        let missing = [];
        if (!profile.headline) missing.push('Headline');
        if (!profile.city) missing.push('Location');
        if (expQuery.rows.length === 0) missing.push('Experience');
        if (eduQuery.rows.length === 0) missing.push('Education');
        if (projQuery.rows.length === 0) missing.push('Projects');
        if (!profile.skills || profile.skills.length < 3) missing.push('Skills (min 3)');

        const responseData = {
            profile: {
                ...profile,
                completion_percentage: completion
            },
            sections: {
                experience: expQuery.rows,
                education: eduQuery.rows,
                projects: projQuery.rows
            },
            missing_sections: missing
        };

        console.log('Sending Dashboard context:', candidateId);
        res.json(responseData);

    } catch (error) {
        console.error('Dashboard Context Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// NEW: Public Profile View
exports.getPublicProfile = async (req, res) => {
    try {
        // This accepts candidate_id (from params) NOT user_id from token
        const candidateId = req.params.id;
        console.log(`[getPublicProfile] Request for ID: ${candidateId}`);

        if (!candidateId || isNaN(parseInt(candidateId))) {
            return res.status(400).json({ message: 'Invalid Profile ID' });
        }

        // Query tables directly to be safe
        const profileQuery = await pool.query(`
            SELECT cp.*, u.email, u.username
            FROM candidate_profile cp
            JOIN users u ON u.user_id = cp.candidate_id
            WHERE cp.candidate_id = $1
        `, [candidateId]);
        const profile = profileQuery.rows[0];

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const expQuery = await pool.query('SELECT * FROM candidate_experience WHERE candidate_id = $1 ORDER BY start_date DESC', [candidateId]);
        const eduQuery = await pool.query('SELECT * FROM candidate_education WHERE candidate_id = $1 ORDER BY start_date DESC', [candidateId]);
        const projQuery = await pool.query('SELECT * FROM candidate_project WHERE candidate_id = $1 ORDER BY start_date DESC', [candidateId]);

        const responseData = {
            profile: profile,
            sections: {
                experience: expQuery.rows,
                education: eduQuery.rows,
                projects: projQuery.rows
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error('Public Profile Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateProfileDetails = async (req, res) => {
    const { headline, summary, city, division, country, contact_number, experience_years, linkedin_url, github_url } = req.body;
    const candidateId = req.user.id;

    // Sanitize numeric fields: PostgreSQL INT doesn't like empty strings
    const sanitizedExpYears = (experience_years === '' || experience_years === undefined) ? null : experience_years;

    try {
        await pool.query(
            'CALL sp_update_candidate_profile($1::BIGINT, $2::VARCHAR, $3::TEXT, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR, $7::VARCHAR, $8::INT, $9::VARCHAR, $10::VARCHAR)',
            [candidateId, headline, summary, city, division, country, contact_number, sanitizedExpYears, linkedin_url, github_url]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateJobPreferences = async (req, res) => {
    const { desired_job_title, employment_type, work_mode_preference, expected_salary_min, expected_salary_max, notice_period_days, willing_to_relocate } = req.body;
    const candidateId = req.user.id;

    const sanitizedMin = (expected_salary_min === '' || expected_salary_min === undefined) ? null : expected_salary_min;
    const sanitizedMax = (expected_salary_max === '' || expected_salary_max === undefined) ? null : expected_salary_max;
    const sanitizedNotice = (notice_period_days === '' || notice_period_days === undefined) ? null : notice_period_days;
    const sanitizedRelocate = (willing_to_relocate === '' || willing_to_relocate === undefined) ? null : (willing_to_relocate === 'true' || willing_to_relocate === true);

    try {
        await pool.query(
            'CALL sp_update_candidate_preferences($1, $2, $3, $4, $5, $6, $7, $8)',
            [candidateId, desired_job_title, employment_type, work_mode_preference, sanitizedMin, sanitizedMax, sanitizedNotice, sanitizedRelocate]
        );
        res.json({ message: 'Job preferences updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Experience
exports.manageExperience = async (req, res) => {
    const { experience_id, company_name, title, start_date, end_date, description, is_current } = req.body;
    const candidateId = req.user.id;
    const op = experience_id ? 'UPDATE' : 'INSERT';

    // Sanitize Dates and IDs - PostgreSQL hates empty strings for these types
    const sanitizedId = (experience_id === '' || experience_id === undefined) ? null : experience_id;
    const sanitizedStart = (start_date === '' || start_date === undefined) ? null : start_date;
    const sanitizedEnd = (end_date === '' || end_date === undefined) ? null : end_date;

    try {
        await pool.query(
            'CALL sp_manage_candidate_experience($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [op, candidateId, sanitizedId, company_name, title, sanitizedStart, sanitizedEnd, description, is_current]
        );
        res.json({ message: 'Experience saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteExperience = async (req, res) => {
    const { id } = req.params;
    const candidateId = req.user.id;
    try {
        await pool.query('CALL sp_manage_candidate_experience($1, $2, $3)', ['DELETE', candidateId, id]);
        res.json({ message: 'Experience deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Education
exports.manageEducation = async (req, res) => {
    const { education_id, institution, degree, field_of_study, start_date, end_date, description } = req.body;
    const candidateId = req.user.id;
    const op = education_id ? 'UPDATE' : 'INSERT';

    // Sanitize Dates and IDs
    const sanitizedId = (education_id === '' || education_id === undefined) ? null : education_id;
    const sanitizedStart = (start_date === '' || start_date === undefined) ? null : start_date;
    const sanitizedEnd = (end_date === '' || end_date === undefined) ? null : end_date;

    try {
        await pool.query(
            'CALL sp_manage_candidate_education($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [op, candidateId, sanitizedId, institution, degree, field_of_study, sanitizedStart, sanitizedEnd, description]
        );
        res.json({ message: 'Education saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteEducation = async (req, res) => {
    const { id } = req.params;
    const candidateId = req.user.id;
    try {
        await pool.query('CALL sp_manage_candidate_education($1, $2, $3)', ['DELETE', candidateId, id]);
        res.json({ message: 'Education deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Projects
exports.manageProject = async (req, res) => {
    const { project_id, title, description, project_url, start_date, end_date } = req.body;
    const candidateId = req.user.id;
    const op = project_id ? 'UPDATE' : 'INSERT';

    // Sanitize Dates and IDs
    const sanitizedId = (project_id === '' || project_id === undefined) ? null : project_id;
    const sanitizedStart = (start_date === '' || start_date === undefined) ? null : start_date;
    const sanitizedEnd = (end_date === '' || end_date === undefined) ? null : end_date;

    try {
        await pool.query(
            'CALL sp_manage_candidate_project($1, $2, $3, $4, $5, $6, $7, $8)',
            [op, candidateId, sanitizedId, title, description, project_url, sanitizedStart, sanitizedEnd]
        );
        res.json({ message: 'Project saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    const candidateId = req.user.id;
    try {
        await pool.query('CALL sp_manage_candidate_project($1, $2, $3)', ['DELETE', candidateId, id]);
        res.json({ message: 'Project deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllCourses = async (req, res) => {
    const userId = req.user.id;
    const { skill, trainer, maxFee, mode } = req.query;

    try {
        let query = `
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
            LEFT JOIN enrollment e ON e.course_id = c.course_id AND e.candidate_id = (SELECT candidate_id FROM candidate_profile WHERE user_id = $1)
            WHERE 1=1
        `;
        const params = [userId];
        let pIndex = 2;

        if (skill) {
            // Support multiple skills (comma-separated or array)
            const skillList = Array.isArray(skill) ? skill : skill.split(',').map(s => s.trim());

            query += ` AND EXISTS (
                SELECT 1 FROM course_skill cs2
                JOIN skill s2 ON s2.skill_id = cs2.skill_id
                WHERE cs2.course_id = c.course_id AND s2.skill_name = ANY($${pIndex})
            )`;
            params.push(skillList);
            pIndex++;
        }

        if (trainer) {
            query += ` AND tp.organization_name ILIKE $${pIndex}`;
            params.push(`%${trainer}%`);
            pIndex++;
        }

        if (maxFee) {
            query += ` AND c.fee <= $${pIndex}`;
            params.push(maxFee);
            pIndex++;
        }

        if (mode && mode !== 'All') {
            query += ` AND c.mode = $${pIndex}`;
            params.push(mode);
            pIndex++;
        }

        query += ` ORDER BY c.created_at DESC`;

        const result = await pool.query(query, params);
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

exports.getMyEnrollments = async (req, res) => {
    const candidateId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT e.enrollment_id, e.status, e.completion_status, e.enrolled_at,
                   c.title AS course_title, c.mode,
                   tp.organization_name AS trainer_name
            FROM enrollment e
            JOIN course c ON c.course_id = e.course_id
            JOIN trainer_profile tp ON tp.trainer_id = c.trainer_id
            WHERE e.candidate_id = $1
            ORDER BY e.enrolled_at DESC
        `, [candidateId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getRecommendedCourses = async (req, res) => {
    const candidateId = req.user.id;
    const { jobId } = req.query;
    try {
        let result;
        if (jobId) {
            result = await pool.query(
                'SELECT * FROM fn_recommend_courses_for_job($1, $2)', [candidateId, jobId]
            );
        } else {
            result = await pool.query(
                'SELECT * FROM fn_recommend_courses($1)', [candidateId]
            );
        }
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getCourseFilters = async (req, res) => {
    try {
        // Get ALL available skills for the filter
        const skillsQuery = await pool.query(`
            SELECT DISTINCT skill_name 
            FROM skill 
            ORDER BY skill_name ASC
        `);

        // Get unique trainer organizations
        const trainersQuery = await pool.query(`
            SELECT DISTINCT tp.organization_name 
            FROM trainer_profile tp
            JOIN course c ON c.trainer_id = tp.trainer_id
            ORDER BY tp.organization_name ASC
        `);

        res.json({
            skills: skillsQuery.rows.map(r => r.skill_name),
            trainers: trainersQuery.rows.map(r => r.organization_name)
        });
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
