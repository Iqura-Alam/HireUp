
const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

const auth = require('../middleware/authMiddleware');

router.use(auth);

// Profile
router.get('/profile', trainerController.getProfile);
router.put('/profile', trainerController.updateProfile);
router.get('/public/:id', trainerController.getPublicTrainerProfile);
router.get('/top-skills', auth, trainerController.getTopSkills);

// Courses
router.post('/add-course', trainerController.addCourse);
router.get('/courses', trainerController.getTrainerCourses);
router.put('/courses/:id', trainerController.updateCourse);
router.delete('/courses/:id', trainerController.deleteCourse);

router.get('/enrollments', trainerController.getCourseEnrollments);
router.patch('/enrollments/:id', trainerController.manageEnrollment);
router.post('/complete-course', trainerController.completeCourse);
router.get('/courses/:id/reviews', trainerController.getTrainerCourseReviews);


// Skill management
router.get('/skills', trainerController.getSkills);
router.post('/skills', trainerController.addSkill);

module.exports = router;
