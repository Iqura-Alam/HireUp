const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/candidate/profile
// @desc    Get current candidate's profile and skills
// @access  Private
router.get('/profile', auth, candidateController.getProfile);

// @route   GET api/candidate/list
// @desc    List all master skills for autocomplete
// @access  Private
router.get('/list', auth, candidateController.listSkills);

// @route   POST api/candidate/skill
// @desc    Add or update a skill
// @access  Private
router.post('/skill', auth, candidateController.addSkill);

module.exports = router;
