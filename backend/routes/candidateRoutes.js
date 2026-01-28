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

const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/jobs', auth, candidateController.getAllJobs);
router.get('/jobs/:jobId', auth, candidateController.getJobDetails);
router.post('/jobs/:jobId/apply', [auth, upload.single('cv')], candidateController.applyForJob);

router.get('/courses', auth, candidateController.getAllCourses);
router.post('/courses/:courseId/enroll', auth, candidateController.enrollInCourse);

module.exports = router;

