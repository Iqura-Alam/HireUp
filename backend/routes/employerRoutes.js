const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const auth = require('../middleware/authMiddleware');

router.get('/profile', auth, employerController.getProfile);
router.put('/profile', auth, employerController.updateProfile);

const authController = require('../controllers/authController');
router.delete('/profile', auth, authController.deleteAccount);

router.get('/public/:id', auth, employerController.getPublicEmployerProfile);

router.post('/jobs', auth, employerController.postJob);
router.get('/jobs', auth, employerController.getJobs);
router.get('/jobs/:jobId/applications', auth, employerController.getJobApplications);

router.put('/applications/:applicationId/shortlist', auth, employerController.shortlistApplication);
router.put('/applications/:applicationId/hire', auth, employerController.hireApplication);
router.put('/applications/:applicationId/reject', auth, employerController.rejectApplication);
router.get('/applications/:applicationId/cv', auth, employerController.getApplicationCV);


router.get('/skills', auth, employerController.getAllSkills);

module.exports = router;
