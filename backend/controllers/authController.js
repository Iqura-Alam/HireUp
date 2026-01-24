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

            // Handle Address
            const p_city = city || location || 'Unknown'; 
            const p_division = division || 'Unknown';
            const p_country = country || 'Bangladesh';

            // Call Stored Procedure: sp_register_candidate
            await pool.query(
                `CALL sp_register_candidate($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [username, email, passwordHash, fName, lName, p_city, p_division, p_country, experience_years || 0]
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
        //  Check if user exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        //  Validate Password
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
