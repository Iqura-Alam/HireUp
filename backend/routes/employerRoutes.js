const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const auth = require('../middleware/authMiddleware');

router.get('/profile', auth, employerController.getProfile);
router.put('/profile', auth, employerController.updateProfile);

router.post('/jobs', auth, employerController.postJob);
router.get('/jobs', auth, employerController.getJobs);
router.get('/jobs/:jobId/applications', auth, employerController.getJobApplications);

router.put('/applications/:applicationId/shortlist', auth, employerController.shortlistApplication);
router.put('/applications/:applicationId/hire', auth, employerController.hireApplication);


router.get('/skills', auth, employerController.getAllSkills);

module.exports = router;
