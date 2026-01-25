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
