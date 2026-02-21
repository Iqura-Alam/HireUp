const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const {
        username, email, password, user_role,
        first_name, last_name, full_name,
        city, division, country, location,
        experience_years
    } = req.body;

    try {
        //Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long and include at least one letter and one number.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        if (user_role === 'Candidate') {
            let fName = first_name;
            let lName = last_name;
            if (!fName && full_name) {
                const parts = full_name.split(' ');
                fName = parts[0];
                lName = parts.slice(1).join(' ') || '';
            }
            if (!fName || !lName) {
                return res.status(400).json({ message: 'First Name and Last Name are required' });
            }

            // Handle Address (Allow Nulls for Quick Signup)
            const p_city = city || null;
            const p_division = division || null;
            const p_country = country || null;
            // Default 0 for int if not provided, or null if procedure allows. Procedure defaults to NULL but JS passes explicit value. 
            // Let's pass null for experience if undefined
            const p_exp = experience_years !== undefined && experience_years !== '' ? experience_years : null;

            // Call Stored Procedure: sp_register_candidate
            await pool.query(
                `CALL sp_register_candidate($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [username, email, passwordHash, fName, lName, p_city, p_division, p_country, p_exp]
            );
        } else if (user_role === 'Employer') {
            // Validate Employer Fields
            const { company_name, industry, contact_number, website } = req.body;
            if (!company_name) {
                return res.status(400).json({ message: 'Company Name is required for Employers' });
            }

            // Call Procedure: sp_register_employer
            await pool.query(
                `CALL sp_register_employer($1, $2, $3, $4, $5, $6, $7, $8)`,
                [username, email, passwordHash, company_name, industry, location, contact_number, website]
            );

        } else if (user_role === 'Trainer') {
            const { organization_name, specialization, contact_number } = req.body;
            await pool.query(
                `CALL sp_register_trainer($1, $2, $3, $4, $5, $6)`,
                [username, email, passwordHash, organization_name, specialization, contact_number]
            );
        } else {
            // Fallback or Error for now
            return res.status(400).json({ message: 'Invalid Role' });
        }

        // AUTO-LOGIN Logic
        // Fetch the user we just created to get their ID
        const userResult = await pool.query('SELECT user_id, username, role FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        // Create JWT Token
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
                res.status(201).json({
                    message: 'Registered and logged in',
                    token,
                    user: { id: user.user_id, username: user.username, role: user.role }
                });
            }
        );

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
        //  Check if user exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Check if account is deleted
        if (user.is_active === false) {
            return res.status(403).json({ message: 'Account deactivated. Please contact support.' });
        }

        //  Validate Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update last_login_at
        await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [user.user_id]);

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

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        await pool.query('UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE user_id = $1', [userId]);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete Account Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
