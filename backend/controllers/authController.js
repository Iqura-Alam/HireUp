const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, email, password, full_name, user_role, location, experience_years } = req.body;

    try {
        // Basic Validation
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        if (user_role === 'Candidate') {
            // Call Stored Procedure: sp_register_candidate
            // Args: p_username, p_email, p_password_hash, p_full_name, p_location, p_experience_years
            await pool.query(
                `CALL sp_register_candidate($1, $2, $3, $4, $5, $6)`,
                [username, email, passwordHash, full_name, location, experience_years || 0]
            );
        } else if (user_role === 'Employer') {
            // Validate Employer Fields
            const { company_name, industry, contact_number, website } = req.body;
            if (!company_name) {
                return res.status(400).json({ message: 'Company Name is required for Employers' });
            }

            // Call Stored Procedure: sp_register_employer
            await pool.query(
                `CALL sp_register_employer($1, $2, $3, $4, $5, $6, $7, $8)`,
                [username, email, passwordHash, company_name, industry, location, contact_number, website]
            );
        } else {
            // Fallback or Error for now
            return res.status(400).json({ message: 'Invalid Role' });
        }

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Username or Email already exists' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Check if user exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // 2. Validate Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 3. Create JWT Token
        const payload = {
            user: {
                id: user.user_id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.user_id, username: user.username, role: user.role } });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
