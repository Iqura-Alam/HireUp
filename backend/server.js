const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trainer', require('./routes/trainerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/candidate', require('./routes/candidateRoutes'));
app.use('/api/employer', require('./routes/employerRoutes'));

// Static files (Frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
