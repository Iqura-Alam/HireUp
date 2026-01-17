
const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

const auth = require('../middleware/authMiddleware');

router.use(auth);


router.post('/add-course', trainerController.addCourse);
router.get('/courses', trainerController.getTrainerCourses);
router.get('/enrollments', trainerController.getCourseEnrollments);
router.post('/complete-course', trainerController.completeCourse);

// Skill management
router.get('/skills', trainerController.getSkills);
router.post('/skills', trainerController.addSkill);

module.exports = router;
