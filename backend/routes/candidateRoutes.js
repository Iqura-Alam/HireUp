const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/candidate/profile
// @desc    Get current candidate's profile and skills
// @access  Private
router.get('/profile', auth, candidateController.getProfile);

// @route   GET api/candidate/public/:id
// @desc    Get public profile of a candidate by ID
// @access  Private
router.get('/public/:id', auth, candidateController.getPublicProfile);

// @route   GET api/candidate/list
// @desc    List all master skills for autocomplete
// @access  Private
router.get('/list', auth, candidateController.listSkills);

// @route   POST api/candidate/skill
// @desc    Add or update a skill
// @access  Private
router.post('/skill', auth, candidateController.addSkill);

// Dashboard & Profile Management
router.get('/dashboard-context', auth, candidateController.getDashboardContext);
router.put('/profile-details', auth, candidateController.updateProfileDetails);
router.put('/job-preferences', auth, candidateController.updateJobPreferences);

const authController = require('../controllers/authController');
router.delete('/profile', auth, authController.deleteAccount);

router.post('/experience', auth, candidateController.manageExperience);
router.delete('/experience/:id', auth, candidateController.deleteExperience);

router.post('/education', auth, candidateController.manageEducation);
router.delete('/education/:id', auth, candidateController.deleteEducation);

router.post('/project', auth, candidateController.manageProject);
router.delete('/project/:id', auth, candidateController.deleteProject);

const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/jobs', auth, candidateController.getAllJobs);
router.get('/jobs/:jobId', auth, candidateController.getJobDetails);
router.post('/jobs/:jobId/apply', [auth, upload.single('cv')], candidateController.applyForJob);

router.get('/courses', auth, candidateController.getAllCourses);
router.get('/course-filters', auth, candidateController.getCourseFilters);
router.post('/courses/:courseId/enroll', auth, candidateController.enrollInCourse);
router.get('/my-enrollments', auth, candidateController.getMyEnrollments);
router.get('/recommended-courses', auth, candidateController.getRecommendedCourses);
router.get('/top-skills', auth, candidateController.getTopSkills);

module.exports = router;

