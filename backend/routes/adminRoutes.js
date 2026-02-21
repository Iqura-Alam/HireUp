
const express = require('express');

const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// Protect all admin routes
router.use(auth);

// Middleware to check if user is admin (optional but good)
// For now, assuming auth middleware populates user, we can add a check here or relies on controller logic if needed?
// The prompt said "Admin routes -> role === 'Admin'". Simple check:

router.use((req, res, next) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    next();
});

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/popular-courses', adminController.getPopularCourses);
router.get('/top-skills', adminController.getTopSkills);

// User Verification Queue
router.get('/pending-users', adminController.getPendingUsers);
router.post('/verify-user/:role/:id', adminController.verifyUser);
router.post('/verify-all', adminController.verifyAllPending);

// Account Controls
router.get('/users', adminController.getAllUsers);
router.post('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
